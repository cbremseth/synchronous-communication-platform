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
import Notification from "./models/Notification.js";

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

// Update the PATCH endpoint to handle all channel updates
app.patch("/api/channels/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const updatedChannel = await Channel.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true }
    ).populate('users', 'username email')
      .populate('createdBy', 'username');

    if (!updatedChannel) {
      return res.status(404).json({ error: "Channel not found" });
    }

    res.status(200).json({
      message: "Channel updated successfully",
      channel: updatedChannel
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

// At the top level of the file, add a map to track active users in channels
const activeUsers = new Map(); // channelId -> Set of userIds

io.on("connection", async (socket) => {
  console.log("a user connected:", socket.id);

  // Handle joining a specific channel
  socket.on("join_channel", async (channelId) => {
    try {
      // Leave previous rooms and update active users
      socket.rooms.forEach((room) => {
        if (room !== socket.id) {
          socket.leave(room);
          // Remove user from previous channel's active users
          const activeSet = activeUsers.get(room);
          if (activeSet && socket.userId) {
            activeSet.delete(socket.userId);
            if (activeSet.size === 0) {
              activeUsers.delete(room);
            }
          }
        }
      });

      // Join new room
      socket.join(channelId);
      console.log(`User joined channel: ${channelId}`);

      // Add user to active users for this channel
      if (socket.userId) {
        if (!activeUsers.has(channelId)) {
          activeUsers.set(channelId, new Set());
        }
        activeUsers.get(channelId).add(socket.userId);
      }

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

  // Handle user joining with their ID
  socket.on("user_connect", (userId) => {
    socket.userId = userId;
    socket.join(`user:${userId}`); // Join a room specific to this user
  });

  // Update the message handler
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

      // Get active users in this channel
      const activeUsersInChannel = activeUsers.get(channelId) || new Set();

      // Get channel members and create notifications only for inactive users
      const notificationPromises = channel.users
        .filter(user =>
          user._id.toString() !== sender && // Don't notify the sender
          !activeUsersInChannel.has(user._id.toString()) // Don't notify active users
        )
        .map(user => {
          const notification = new Notification({
            userId: user._id,
            type: "NEW_MESSAGE",
            channelId,
            senderId: sender,
            content: `${senderName}: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`,
          });
          return notification.save();
        });

      await Promise.all(notificationPromises);

      // Notify users in real-time (only inactive users)
      channel.users.forEach(user => {
        const userId = user._id.toString();
        if (userId !== sender && !activeUsersInChannel.has(userId)) {
          io.to(`user:${userId}`).emit("notification", {
            _id: new mongoose.Types.ObjectId().toString(),
            type: "NEW_MESSAGE",
            channelId: channelId.toString(),
            channelName: channel.name,
            content: `New message from ${senderName} in ${channel.name}`,
            timestamp: new Date()
          });
        }
      });
    } catch (error) {
      console.error("Error handling message:", error);
    }
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log("user disconnected:", socket.id);
    // Clean up active users on disconnect
    activeUsers.forEach((users, channelId) => {
      if (socket.userId && users.has(socket.userId)) {
        users.delete(socket.userId);
        if (users.size === 0) {
          activeUsers.delete(channelId);
        }
      }
    });
  });
});

// Add endpoint to handle channel invites
app.post("/api/channels/:channelId/invite", async (req, res) => {
  try {
    const { channelId } = req.params;
    const { userIds } = req.body;

    const channel = await Channel.findById(channelId)
      .populate('users')
      .populate('createdBy');

    if (!channel) {
      return res.status(404).json({ error: "Channel not found" });
    }

    // Create notifications for invited users
    const notificationPromises = userIds.map(async (userId) => {
      const notification = new Notification({
        userId,
        type: "CHANNEL_INVITE",
        channelId,
        senderId: channel.createdBy._id,
        content: `You've been added to ${channel.name}`,
      });
      await notification.save();

      // Send real-time notification
      io.to(`user:${userId}`).emit("notification", {
        _id: new mongoose.Types.ObjectId(),
        type: "CHANNEL_INVITE",
        channelId: channelId.toString(),
        channelName: channel.name,
        content: `You've been added to ${channel.name}`,
        timestamp: new Date()
      });
    });

    await Promise.all(notificationPromises);
    res.status(200).json({ message: "Invites sent successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Add endpoint to get user notifications
app.get("/api/notifications", async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    const notifications = await Notification.find({ userId, read: false })
      .populate('channelId', 'name')
      .populate('senderId', 'username')
      .sort({ timestamp: -1 });

    res.json(notifications);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Add endpoint to mark notifications as read
app.patch("/api/notifications/read", async (req, res) => {
  try {
    const { notificationIds } = req.body;
    await Notification.updateMany(
      { _id: { $in: notificationIds } },
      { $set: { read: true } }
    );
    res.json({ message: "Notifications marked as read" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
