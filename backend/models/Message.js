import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  senderName: {
    type: String,
    required: true,
  },
  channelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Channel",
    required: true,
    index: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
  fileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "fs.files",
    default: null,
  },
  fileName: {
    type: String,
    default: null,
  },
  fileType: {
    type: String,
    default: null,
  },
  fileSize: {
    type: Number,
    default: null,
  },
});

// Compound index for efficient message retrieval in a channel
messageSchema.index({ channelId: 1, timestamp: 1 });

// Create a text index on message content for fast search
messageSchema.index({ content: "text" });

export default mongoose.model("Message", messageSchema);
