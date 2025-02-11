import mongoose from "mongoose";

const UserProfileSchema = new mongoose.Schema({
  userID: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  username: { type: String, unique: true },
  bio: { type: String, default: "" },
});

const UserProfile =
  mongoose.models.UserProfile ||
  mongoose.model("UserProfile", UserProfileSchema);
export default UserProfile;
