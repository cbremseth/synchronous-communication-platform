import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  password: { type: String, required: true },
  userId: {
    type: Number,
    unique: true,
    default: () => Math.floor(100000000000 + Math.random() * 900000000000),
  },
  blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  friends: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
});

mongoose.connect("mongodb://localhost:27017/ChatDataBase", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const User = mongoose.model("User", userSchema);

export default User;
