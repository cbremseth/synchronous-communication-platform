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
      .populate("users", "username email")
      .populate("createdBy", "username");
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
      return res
        .status(400)
        .json({ error: "Name, users, and createdBy are required" });
    }

    const newChannel = new Channel({
      name,
      users,
      createdBy,
      isDirectMessage: isDirectMessage || false,
    });
    await newChannel.save();

    const populatedChannel = await Channel.findById(newChannel._id)
      .populate("users", "username email")
      .populate("createdBy", "username");

    res.status(201).json({
      message: "Channel created successfully",
      channel: populatedChannel,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update the PATCH endpoint to handle all channel updates
app.patch("/api/channels/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const updatedChannel = await Channel.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true },
    )
      .populate("users", "username email")
      .populate("createdBy", "username");

    if (!updatedChannel) {
      return res.status(404).json({ error: "Channel not found" });
    }

    res.status(200).json({
      message: "Channel updated successfully",
      channel: updatedChannel,
    });
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
      { new: true },
    )
      .populate("users", "username email")
      .populate("createdBy", "username");

    if (!updatedChannel) {
      return res.status(404).json({ error: "Channel not found" });
    }

    res.status(200).json({
      message: "Channel users updated",
      channel: updatedChannel,
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

// endpoint to search for users (based on username or email) and messages
app.get("/api/searchbar", async (req, res) => {
  try {
    const { query, limit = 10, page = 1 } = req.query;
    if (!query) return res.status(400).json({ error: "Query is required" });

    // Search Users (username, email)
    const users = await User.find({ $text: { $search: query } })
      .select("_id username email")
      .limit(Number(limit))
      .skip((page - 1) * limit);

    // Search Messages (content) and populate sender
    const messages = await Message.find({ $text: { $search: query } })
      .populate("sender", "username email")
      .select("_id content sender")
      .limit(Number(limit))
      .skip((page - 1) * limit);

    // Format results
    const formattedMessages = messages.map((msg) => ({
      _id: msg._id,
      content: msg.content,
      senderId: msg.sender?._id || null,
      senderName: msg.sender?.username || "Unknown",
      senderEmail: msg.sender?.email || "No Email",
    }));

    res.json({ users, messages: formattedMessages });
  } catch (error) {
    console.error("Error searching:", error);
    res.status(500).json({ message: "Server error", error });
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
        { username: { $regex: query, $options: "i" } },
        { email: { $regex: query, $options: "i" } },
      ],
    }).select("username email");

    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Add endpoint to get or create general chat room
app.get("/api/channels/general", async (req, res) => {
  try {
    const userId = req.query.userId;
    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    // Try to find existing general chat
    let generalChannel = await Channel.findOne({ name: "General Chat" })
      .populate("users", "username email")
      .populate("createdBy", "username");

    // If general chat doesn't exist, create it
    if (!generalChannel) {
      const newChannel = new Channel({
        name: "General Chat",
        users: [userId], // Start with the requesting user
        createdBy: userId,
      });
      await newChannel.save();

      generalChannel = await Channel.findById(newChannel._id)
        .populate("users", "username email")
        .populate("createdBy", "username");
    } else {
      // If user is not in the channel, add them
      if (!generalChannel.users.some((u) => u._id.toString() === userId)) {
        generalChannel.users.push(userId);
        await generalChannel.save();

        // Refresh the populated data
        generalChannel = await Channel.findById(generalChannel._id)
          .populate("users", "username email")
          .populate("createdBy", "username");
      }
    }

    res.json(generalChannel);
  } catch (error) {
    console.error("Error with general channel:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get specific channel by ID
app.get("/api/channels/:id", async (req, res) => {
  try {
    const channel = await Channel.findById(req.params.id)
      .populate("users", "username email")
      .populate("createdBy", "username");

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
        .populate("sender", "username")
        .sort({ timestamp: 1 })
        .limit(100);

      const formattedMessages = messageHistory.map((msg) => ({
        _id: msg._id.toString(),
        content: msg.content,
        sender: msg.sender ? msg.sender._id.toString() : null,
        senderName: msg.sender ? msg.sender.username : "Deleted User",
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

  socket.on("updateMessage", async ({ messageId, newContent, userId }) => {
    try {
      // Find the message and verify ownership
      const message = await Message.findById(messageId);

      if (!message) {
        console.error("Message not found");
        return;
      }

      if (message.sender.toString() !== userId) {
        console.error("Unauthorized message update attempt");
        return;
      }

      // Update the message
      message.content = newContent;
      await message.save();

      // Broadcast the update to all clients
      io.emit("messageUpdated", {
        _id: message._id,
        content: newContent,
        sender: message.sender,
        senderName: message.senderName,
        timestamp: message.timestamp,
      });
    } catch (error) {
      console.error("Error updating message:", error);
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// PUT request to update username and password; skips a field if empty
app.put("/api/users/:id", async (req, res) => {
  const { username, password } = req.body;
  const userId = req.params.id;

  if (!username && !password) {
    return res.status(400).json({
      message:
        "At least one field (username or password) is required to update.",
    });
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (username) {
      user.username = username;
    }
    if (password) {
      user.password = password;
    }

    await user.save();
    res.status(200).json({ message: "User updated successfully", user });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Delete account end point
app.delete("/api/users/:id", async (req, res) => {
  const { id: userId } = req.params;
  if (!userId) {
    return res.status(400).json({ message: "User id is required." });
  }
  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    await user.deleteOne();
    res.status(200).json({ message: "User deleted successfully." });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

io.on("connection", (socket) => {
  socket.on("join_channel", async (channelId) => {
    try {
      const channel = await Channel.findById(channelId).populate({
        path: "users",
        select: "_id username status",
      });

      if (!channel) return;

      const participants = channel.users.map((user) => ({
        id: user._id,
        username: user.username,
        status: user.status,
      }));

      socket.join(channelId);
      socket.emit("channel_participants", participants);
    } catch (error) {
      socket.emit("error", {
        message: "Error joining channel",
        error: error.message,
      });
    }
  });
});

app.put("/api/users/:id/status", async (req, res) => {
  const userId = req.params.id;
  const { status } = req.body;
  if (!userId || !status) {
    return res
      .status(400)
      .json({ message: "User id and status are required." });
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    user.status = status;
    await user.save();

    // Emit the updated status to all connected sockets
    io.emit("statusUpdated", { userId: user._id, status: user.status });
    res
      .status(200)
      .json({ success: true, message: "Status updated successfully." });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});
