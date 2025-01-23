import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import { createServer } from "http";
import { Server } from "socket.io";


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

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log(socket.id);
  console.log("a user connected");

  socket.on("message", (message) => {
    console.log("Received message:", message);
    io.emit("message", message);
  });
});

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
