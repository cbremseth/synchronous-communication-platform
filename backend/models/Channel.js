import mongoose from "mongoose";

const channelSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    active: { type: Boolean, required: true, default: true },
    users: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    fileUpLoadLimit: {
      type: Number,
      default: 5 * 1024, // Default: 5KB, displays in bytes
    },
  },
  { timestamps: true },
);

const Channel = mongoose.model("Channel", channelSchema);

export default Channel;
