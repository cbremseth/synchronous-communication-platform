import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import User from "./models/Users.js";
import Channel from "./models/Channel.js";
import Message from "./models/Message.js";
import { config } from "dotenv";
config({ path: "../.env" });
import { createServer } from "http";
import { Server } from "socket.io";

const app = express();

app.use(cors());
app.use(express.json());

mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    authSource: "admin",
  })
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Error connecting to MongoDB:", err));

app.get("/", (req, res) => {
  res.send("API is running");
});

app.post("/api/signup", async (req, res) => {
  const { email, username, password } = req.body;

  try {
    const newUser = new User({ email, username, password });
    await newUser.save();
    res
      .status(201)
      .json({ message: "User created successfully", user: newUser });
  } catch (error) {
    if (error.code === 11000) {
      // Duplicate key error/ using emails as keys
      res.status(400).json({ message: "Email already exists", error });
    } else {
      res.status(500).json({ message: "Server error", error });
    }
  }
});

// GET /channels - Get list of all channels in database
app.get("/api/channels", async (req, res) => {
  try {
    const userId = req.query.userId;
    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    const channels = await Channel.find({ users: userId })
      .populate('users', 'username email')
      .populate('createdBy', 'username');
    res.status(200).json(channels);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /channels - Create a new channel in the database
app.post("/api/channels", async (req, res) => {
  try {
    const { name, users, createdBy, isDirectMessage } = req.body;

    if (!name || !users || !createdBy) {
      return res.status(400).json({ error: "Name, users, and createdBy are required" });
    }

    const newChannel = new Channel({
      name,
      users,
      createdBy,
      isDirectMessage: isDirectMessage || false
    });
    await newChannel.save();

    const populatedChannel = await Channel.findById(newChannel._id)
      .populate('users', 'username email')
      .populate('createdBy', 'username');

    res.status(201).json({
      message: "Channel created successfully",
      channel: populatedChannel
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /channels/:id - Mark a channel as inactive
app.patch("/api/channels/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const updatedChannel = await Channel.findByIdAndUpdate(
      id,
      { active: false },
      { new: true },
    );

    if (!updatedChannel) {
      return res.status(404).json({ error: "Channel not found" });
    }

    res
      .status(200)
      .json({ message: "Channel marked as inactive", channel: updatedChannel });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// New endpoint to manage channel users
app.patch("/api/channels/:id/users", async (req, res) => {
  try {
    const { id } = req.params;
    const { users } = req.body;

    const updatedChannel = await Channel.findByIdAndUpdate(
      id,
      { $set: { users } },
      { new: true }
    ).populate('users', 'username email')
      .populate('createdBy', 'username');

    if (!updatedChannel) {
      return res.status(404).json({ error: "Channel not found" });
    }

    res.status(200).json({
      message: "Channel users updated",
      channel: updatedChannel
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/signin", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    res.json({
      user: {
        email: user.email,
        username: user.username,
        _id: user._id,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Add this new endpoint
app.get("/api/users/search", async (req, res) => {
  try {
    const query = req.query.q;
    if (!query) {
      return res.status(400).json({ error: "Search query is required" });
    }

    const users = await User.find({
      $or: [
        { username: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } }
      ]
    }).select('username email');

    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/channels/:id", async (req, res) => {
  try {
    const channel = await Channel.findById(req.params.id)
      .populate('users', 'username email')
      .populate('createdBy', 'username');

    if (!channel) {
      return res.status(404).json({ error: "Channel not found" });
    }

    res.json(channel);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

const PORT = process.env.BACKEND_PORT || 5001;

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

io.on("connection", async (socket) => {
  console.log("a user connected:", socket.id);

  // Handle joining a specific channel
  socket.on("join_channel", async (channelId) => {
    try {
      // Leave previous rooms
      socket.rooms.forEach((room) => {
        if (room !== socket.id) {
          socket.leave(room);
        }
      });

      // Join new room
      socket.join(channelId);
      console.log(`User joined channel: ${channelId}`);

      // Send channel message history
      const messageHistory = await Message.find({ channelId })
        .populate('sender', 'username')
        .sort({ timestamp: 1 })
        .limit(100);

      const formattedMessages = messageHistory.map((msg) => ({
        _id: msg._id.toString(),
        content: msg.content,
        sender: msg.sender._id.toString(),
        senderName: msg.sender.username,
        channelId: msg.channelId.toString(),
        timestamp: msg.timestamp,
      }));

      socket.emit("message_history", formattedMessages);
    } catch (error) {
      console.error("Error in join_channel:", error);
    }
  });

  socket.on("message", async (message) => {
    const { content, sender, senderName, channelId } = message;

    try {
      // Validate channelId exists
      const channel = await Channel.findById(channelId);
      if (!channel) {
        console.error("Channel not found:", channelId);
        return;
      }

      // Save message to database with channelId
      const newMessage = new Message({
        content,
        sender,
        senderName,
        channelId,
        timestamp: new Date(),
      });
      await newMessage.save();

      // Format the message for sending
      const messageToSend = {
        _id: newMessage._id.toString(),
        content,
        sender,
        senderName,
        channelId,
        timestamp: newMessage.timestamp,
      };

      // Emit message only to users in the same channel
      io.to(channelId).emit("message", messageToSend);
    } catch (error) {
      console.error("Error saving/sending message:", error);
    }
  });

  socket.on("disconnect", () => {
    console.log("user disconnected:", socket.id);
  });
});

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
