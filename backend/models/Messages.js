import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  message: { type: String, required: true },
  // TODO: Update this to match the user once we have authentication
  sender: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

const Message = mongoose.model("Message", messageSchema);

export default Message;
