import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import User from "./models/Users.js";
import { config } from "dotenv";
config({ path: "../.env" });

const app = express();

app.use(cors());
app.use(express.json());

mongoose
  .connect(process.env.MONGODB_URI, {
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

const PORT = process.env.BACKEND_PORT || 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
