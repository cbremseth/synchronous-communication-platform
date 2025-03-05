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
import seedUsers from "./seed.js"; // Import the seed function
import multer from "multer";
import { GridFsStorage } from "multer-gridfs-storage";
import { GridFSBucket, ObjectId } from "mongodb";
import Notification from "./models/Notification.js";

const app = express();
const MAXLIMIT_FILE_UPLOAD = 100; // 100KB system limit

app.use(cors());
app.use(express.json());

mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    authSource: "admin",
  })
  .then(() => console.log("Connected to MongoDB"))
  .then(() => seedUsers())
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

    io.emit("channelCreated", populatedChannel);

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

    io.emit("channelUpdated", updatedChannel);

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
  socket.on("join_channel", async (channelId, userId) => {
    try {
      if (!userId) {
        console.error("No userId provided when joining channel");
        return;
      }

      // Store userId in socket
      socket.userId = userId;

      // Leave previous rooms
      socket.rooms.forEach((room) => {
        if (room !== socket.id && room !== userId) {
          socket.leave(room);
        }
      });

      // Join new room
      socket.join(channelId);
      console.log(`User ${userId} joined channel: ${channelId}`);

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
        reactions: msg.reactions,
      }));

      socket.emit("message_history", formattedMessages);

      // Send channel participants
      const channel = await Channel.findById(channelId).populate(
        "users",
        "username status",
      );
      const participants = channel.users.map((user) => ({
        id: user._id.toString(),
        username: user.username,
        status: user.status,
      }));
      io.to(channelId).emit("channel_participants", participants);
    } catch (error) {
      console.error("Error in join_channel:", error);
    }
  });

  socket.on("update_status", async ({ userId, status }) => {
    try {
      const user = await User.findById(userId);
      if (!user) {
        console.error("User not found:", userId);
        return;
      }

      user.status = status;
      await user.save();

      io.emit("statusUpdated", { userId, status });
    } catch (error) {
      console.error("Error updating status:", error);
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

      // Extract mentions from message content
      const mentionRegex = /@(\w+)/g;
      const mentionedUsernames =
        content.match(mentionRegex)?.map((m) => m.substring(1)) || [];

      // Find mentioned users
      const mentionedUsers = await User.find({
        username: { $in: mentionedUsernames },
      });

      const mentionedUserIds = mentionedUsers.map((user) => user._id);

      // Save message to database with channelId and mentions
      const newMessage = new Message({
        content,
        sender,
        senderName,
        channelId,
        mentions: mentionedUserIds,
        timestamp: new Date(),
      });
      await newMessage.save();

      // Get all sockets in the channel and their user IDs
      const socketsInChannel = await io.in(channelId).fetchSockets();
      const usersInChannel = new Set(
        socketsInChannel.map((socket) => socket.userId).filter(Boolean),
      );

      console.log("Users currently in channel:", Array.from(usersInChannel));
      console.log("Sender:", sender);

      // Create notifications for all mentioned users (regardless of channel presence)
      const notifications = mentionedUsers
        .filter((user) => user._id.toString() !== sender) // Only filter out the sender
        .map((user) => ({
          recipient: user._id,
          type: "mention",
          channelId,
          messageId: newMessage._id,
          sender,
        }));

      // Get all users who should receive channel notifications (only offline users)
      const channelUserIds = channel.users.map((id) => id.toString());
      const offlineUsers = channelUserIds.filter((userId) => {
        const isInChannel = usersInChannel.has(userId);
        const isSender = userId === sender;
        const isMentioned = mentionedUsers.some(
          (user) => user._id.toString() === userId,
        );
        console.log(
          `Checking user ${userId}: in channel? ${isInChannel}, is sender? ${isSender}, is mentioned? ${isMentioned}`,
        );
        // Don't send regular message notification if user is in channel, is sender, or was mentioned
        return !isInChannel && !isSender && !isMentioned;
      });

      console.log("Users to notify for regular messages:", offlineUsers);

      // Add notifications for offline users (regular messages)
      notifications.push(
        ...offlineUsers.map((userId) => ({
          recipient: userId,
          type: "message",
          channelId,
          messageId: newMessage._id,
          sender,
        })),
      );

      if (notifications.length > 0) {
        console.log(`Creating ${notifications.length} notifications`);
        const savedNotifications = await Notification.insertMany(notifications);

        // Emit notifications to relevant users
        savedNotifications.forEach((notification) => {
          io.to(notification.recipient.toString()).emit("notification", {
            _id: notification._id,
            type: notification.type,
            channelId: notification.channelId,
            messageId: notification.messageId,
            sender: senderName,
            content: content,
            read: false,
          });
        });
      }

      // Format the message for sending
      const messageToSend = {
        _id: newMessage._id.toString(),
        content,
        sender,
        senderName,
        channelId,
        mentions: mentionedUserIds,
        timestamp: newMessage.timestamp,
      };

      // Emit message only to users in the same channel
      io.to(channelId).emit("message", messageToSend);
    } catch (error) {
      console.error("Error saving/sending message:", error);
    }
  });

  // Add socket handler for joining user-specific notification room
  socket.on("join_user", (userId) => {
    if (userId) {
      socket.userId = userId; // Store userId in socket for later use
      socket.join(userId); // Join user-specific room for notifications
      console.log(`User ${userId} connected to their notification room`);
    }
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}, userId: ${socket.userId}`);
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

  // Handle file uploads
  socket.on(
    "fileUpload",
    async ({ fileName, fileSize, fileType, senderName, channelId }) => {
      try {
        console.log(`File upload: ${fileName} by ${senderName}`);

        // Emit file upload to all users in channel
        io.to(channelId.toString()).emit("file_uploaded", {
          fileName,
          fileType,
          fileSize,
          senderName,
        });
      } catch (error) {
        console.log("Error handling file upload event: ", error);
      }
    },
  );

  socket.on("add_reaction", async ({ messageId, emoji, userId, channelId }) => {
    try {
      const message = await Message.findById(messageId);
      if (!message) {
        console.error("Message not found:", messageId);
        return;
      }

      if (!message.reactions.has(emoji)) {
        // If the emoji key doesn't exist, initialize it
        message.reactions.set(emoji, { count: 0, users: [] });
      }

      const reaction = message.reactions.get(emoji);
      const userIndex = reaction.users.indexOf(userId);

      if (userIndex === -1) {
        // User has NOT reacted yet → Add reaction
        reaction.count += 1;
        reaction.users.push(userId);
      } else {
        // User has already reacted → Remove reaction
        reaction.count -= 1;
        reaction.users.splice(userIndex, 1);

        // If no users left, remove the emoji from reactions
        if (reaction.count === 0) {
          message.reactions.delete(emoji);
        }
      }

      // Save updates
      await message.save();
      console.log("Updated Reactions:", Object.fromEntries(message.reactions));

      // Emit full updated reactions back to all users in the channel
      io.to(channelId).emit("add_reaction", {
        messageId,
        reactions: Object.fromEntries(message.reactions),
      });
    } catch (error) {
      console.error("Error updating reaction:", error);
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

// Add new endpoint to get user notifications
app.get("/api/notifications", async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    const notifications = await Notification.find({ recipient: userId })
      .populate("sender", "username")
      .populate("messageId", "content")
      .sort({ timestamp: -1 })
      .limit(50);

    res.json(notifications);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Add endpoint to mark notifications as read
app.patch("/api/notifications/read", async (req, res) => {
  try {
    const { notificationIds } = req.body;
    if (!notificationIds || !Array.isArray(notificationIds)) {
      return res
        .status(400)
        .json({ error: "Notification IDs array is required" });
    }

    await Notification.updateMany(
      { _id: { $in: notificationIds } },
      { $set: { read: true } },
    );

    res.json({ message: "Notifications marked as read" });
  } catch (error) {
    console.error("Error marking notifications as read:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Set up GridFS Storage Engine for File Uploads**
const storage = new GridFsStorage({
  url: process.env.MONGODB_URI,
  options: { useNewUrlParser: true, useUnifiedTopology: true },
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      if (!file) {
        reject(new Error("File is missing"));
      }

      const fileInfo = {
        filename: `${Date.now()}-${file.originalname}`,
        bucketName: "file-uploads",
      };

      resolve(fileInfo);
    });
  },
});

const upload = multer({ storage });

// Upload File API
app.post("/api/upload", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res
      .status(400)
      .json({ error: "File upload failed. No file received." });
  }

  const { channelId, senderId, senderName } = req.body;
  if (!channelId || !senderId) {
    return res
      .status(400)
      .json({ error: "Missing required fields: channelId or senderId" });
  }
  // Check if within channel's file upload limit
  const channel = await Channel.findById(channelId);
  if (!channel) {
    return res.status(401).json({ error: "Channel not found" });
  }

  console.log("Channel info: ", channel);
  // Get the file upload limit (default 5MB if not set)
  const fileUploadLimit_config = channel.fileUpLoadLimit || 5 * 1024; // Default 5KB in bytes
  console.log(
    `current limit of channel ${channelId}: `,
    fileUploadLimit_config,
  );

  // Check if file size exceeds the channel's limit
  if (req.file.size > fileUploadLimit_config) {
    console.log("Requested file larger than limit");
    return res.status(402).json({
      error: `File exceeds the size limit of ${fileUploadLimit_config} KB`,
    });
  }

  try {
    const fileId = req.file.id;
    const fileName = req.file.filename;
    const fileType = req.file.contentType;
    const fileSize = req.file.size;
    const message_content = `Uploaded a file: ${fileName}`;

    const newMessage = new Message({
      content: message_content,
      sender: senderId,
      senderName: senderName || "Unknown",
      channelId: channelId,
      fileId: fileId,
      fileName: fileName,
      fileType: fileType,
      fileSize: fileSize,
      timestamp: new Date(),
    });

    try {
      await newMessage.save();
      console.log("Message saved successfully");
    } catch (error) {
      console.error("Error saving message:", error);
    }

    io.to(channelId).emit("file_uploaded", {
      fileId,
      fileName,
      fileType,
      fileSize,
      senderName,
      channelId,
      timestamp: new Date(),
    });

    io.to(channelId).emit("message", {
      _id: newMessage._id.toString(),
      content: message_content,
      sender: senderId,
      senderName,
      channelId,
      timestamp: newMessage.timestamp,
    });

    res.status(200).json({
      message: "File uploaded successfully",
      fileId,
      fileName,
      fileType,
      fileSize,
    });
  } catch (error) {
    console.error("File upload error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Retrieve all files in a given channelId
app.get("/api/files/:channelId", async (req, res) => {
  try {
    const channelId = req.params.channelId;
    const files = await Message.find({
      channelId: channelId,
      fileId: { $ne: null },
    }).select("fileName fileSize fileType fileId fileId senderName");
    res.json(files);
  } catch (error) {
    console.error("Error retrieving files:", error);
    res.status(500).json({ message: "Server error", error });
  }
});

app.get("/api/preview/:fileId", async (req, res) => {
  try {
    const fileId = new ObjectId(req.params.fileId);

    const bucket = new GridFSBucket(mongoose.connection.db, {
      bucketName: "file-uploads",
    });

    // Find the file in the database to get the contentType
    const file = await bucket.find({ _id: fileId }).toArray();
    if (!file || file.length === 0) {
      return res.status(404).send("File not found");
    }

    // Set the proper content type
    res.type(file[0].contentType);

    // Create a download stream and pipe it to the response
    const downloadStream = bucket.openDownloadStream(fileId);
    downloadStream.pipe(res);
  } catch (error) {
    console.error("Error sending file:", error);
    res.status(500).json({ message: "Server error", error });
  }
});

// Download files by fileID
app.get("/api/download/:fileId", async (req, res) => {
  const fileId = new mongoose.Types.ObjectId(req.params.fileId); // Convert string ID to ObjectId
  const bucket = new GridFSBucket(mongoose.connection.db, {
    bucketName: "file-uploads",
  });

  const file = await bucket.find({ _id: fileId }).toArray();
  if (file.length === 0) {
    res.status(404).send("No file found.");
    return;
  }

  res.set("Content-Type", file[0].contentType);
  res.set("Content-Disposition", `attachment; filename="${file[0].filename}"`);

  const downloadStream = bucket.openDownloadStream(fileId);
  downloadStream.on("error", function (error) {
    res.status(404).send("Error downloading file: ", error);
  });

  downloadStream.pipe(res);
});
// Endpoint to fetch usernames and emoji from message ID
app.post("/api/reactionDetails/:messageId", async (req, res) => {
  try {
    const { messageId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({ error: "Invalid message ID" });
    }

    const message = await Message.findById(messageId);

    if (!message) {
      message.reactions = {};
    }

    /// Convert Map to Object and extract user details
    const reactionDetails = {};

    console.log(
      "Emoji data with decoded names (static files/dynamic files from DB:",
    );
    // Fetch user details for all reactions
    for (const [
      encodedEmoji,
      { count, users },
    ] of message.reactions.entries()) {
      const userObjects = await User.find(
        { _id: { $in: users } },
        { username: 1, _id: 0 },
      );

      // Decode emoji filename (if it's encoded)
      const decodedEmoji = encodedEmoji
        .replace(/_slash_/g, "/")
        .replace(/_dot_/g, ".");

      console.log(`Decoded emoji filename: ${decodedEmoji}`);

      reactionDetails[decodedEmoji] = {
        count,
        users: userObjects.map((user) => user.username), // Convert user IDs to usernames
      };
    }
    // Return data to frontend
    res.json({ reactionDetails });
  } catch (error) {
    console.error("Error fetching reaction details:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update user status endpoint
app.put("/api/users/:userId/status", async (req, res) => {
  const userId = req.params.userId;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ message: "Status is required" });
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    user.status = status;
    await user.save();
    res.status(200).json({ message: "Status updated successfully", user });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Handle check if user is channel owner
app.post("/api/channels/:channelId/is-owner", async (req, res) => {
  try {
    const { channelId } = req.params;
    const userId = req.body.userId;

    const channel = await Channel.findById(channelId);
    if (!channel) return res.status(404).json({ error: "Channel not found" });

    const isOwner = channel.createdBy?.toString() === userId;
    return res.json({ isOwner });
  } catch (error) {
    console.error("Error checking ownership:", error);
    return res.status(500).json({ error: "Server error" });
  }
});

app.put("/api/:channelId/update-file-limit", async (req, res) => {
  const { channelId } = req.params;
  let { fileUploadLimit } = req.body;

  try {
    // Check if the channel exists
    const channel = await Channel.findById(channelId);
    if (!channel) {
      return res.status(401).json({ message: "Channel not found" });
    }

    // Validate the new file limit
    console.log(`Request change file limit to: ${fileUploadLimit} KB`);
    if (fileUploadLimit <= 0 || fileUploadLimit > MAXLIMIT_FILE_UPLOAD) {
      return res
        .status(402)
        .json({ message: "<System>: Invalid file size limit 100KB" });
    }

    // Update the file upload limit
    channel.fileUpLoadLimit = fileUploadLimit * 1024; //in bytes

    await channel.save();
    console.log("saved new limit: ", channel.fileUpLoadLimit);
    io.to(channelId).emit("file_limit_updated", { fileUploadLimit });

    res.json({ message: "File upload limit updated", fileUploadLimit });
  } catch (error) {
    console.error("Error updating file limit:", error);
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/api/:channelId/get-file-limit", async (req, res) => {
  const { channelId } = req.params;

  try {
    // Check if the channel exists
    const channel = await Channel.findById(channelId);
    if (!channel) {
      return res.status(404).json({ message: "Channel not found" });
    }

    // Get the file upload limit
    const channel_fileUploadLimit = channel.fileUpLoadLimit;

    res.json({ fileUpLoadLimit: channel_fileUploadLimit });
  } catch (error) {
    console.error("Error updating file limit:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Handle fetching custom emoji
app.get("/api/custom-emojis", async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const collection = db.collection("file-uploads.files");
    const imageFiles = await collection
      .find({ contentType: /^image\// })
      .toArray();

    console.log("Potential custom images:", imageFiles);

    console.log("potential custom images: ", imageFiles);

    if (!imageFiles.length) {
      return res
        .status(404)
        .json({ error: "No image found in uploaded files" });
    }

    const emojis = imageFiles.map((file) => ({
      id: file._id.toString(), // Convert ObjectId to string
      name: file.filename,
      src: `http://localhost:5001/api/emojis/${file._id}`, // URL to serve image
    }));

    res.json({ emojis });
  } catch (error) {
    console.error("Error fetching custom emojis:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Send images from GridFS to Frontend
app.get("/api/emojis/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: "file-uploads",
    });

    const objectId = new mongoose.Types.ObjectId(id);

    const filesCollection =
      mongoose.connection.db.collection("file-uploads.files");
    const file = await filesCollection.findOne({ _id: objectId });

    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }

    res.set("Content-Type", file.contentType); // Set correct MIME type
    const downloadStream = bucket.openDownloadStream(objectId);
    downloadStream.pipe(res);
  } catch (error) {
    console.error("Error fetching emoji image:", error);
    res.status(500).json({ error: "Failed to fetch image" });
  }
});

// message deletion

app.delete("/api/messages/:id", async (req, res) => {
  const { id } = req.params; // Message ID
  const { userId } = req.body; // User ID from request body

  if (!userId) {
    return res
      .status(400)
      .json({ error: "User ID is required to delete a message" });
  }

  try {
    const message = await Message.findById(id);

    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    // Check if the user deleting the message is the sender
    if (message.sender.toString() !== userId) {
      return res
        .status(403)
        .json({ error: "You can only delete your own messages" });
    }

    const channelId = message.channelId; // Get the channel ID before deletion

    await message.deleteOne();

    // Emit a socket event to inform all users in the channel that the message was deleted
    io.to(channelId.toString()).emit("message_deleted", { messageId: id });

    res.status(200).json({ message: "Message deleted successfully" });
  } catch (error) {
    console.error("Error deleting message:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
