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
    const channels = await Channel.find();
    res.status(200).json(channels);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /channels - Create a new channel in the database
app.post("/api/channels", async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }

    const newChannel = new Channel({ name });
    await newChannel.save();

    res
      .status(201)
      .json({ message: "Channel created successfully", channel: newChannel });
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

const PORT = process.env.BACKEND_PORT || 5001;

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

io.on("connection", async (socket) => {
  console.log(socket.id);
  console.log("a user connected");

  socket.on("get_message_history", async () => {
    try {
      const messageHistory = await Message.find({})
        .populate("sender", "username")
        .sort({ timestamp: 1 })
        .limit(100);

      const formattedMessages = messageHistory.map((msg) => ({
        _id: msg._id,
        content: msg.content,
        sender: msg.sender._id,
        senderName: msg.sender.username,
        timestamp: msg.timestamp,
      }));

      socket.emit("message_history", formattedMessages);
    } catch (error) {
      console.error("Error fetching message history:", error);
    }
  });

  socket.on("message", async (message) => {
    const { content, sender, senderName } = message;
    // save message to database
    const newMessage = new Message({
      content,
      sender,
      senderName,
      timestamp: new Date(),
    });
    await newMessage.save();
    io.emit("message", { ...message, _id: newMessage._id });
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
