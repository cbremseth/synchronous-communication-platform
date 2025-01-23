import "dotenv/config";
import express from "express";
import mongoose from "mongoose";

const app = express();

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

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
