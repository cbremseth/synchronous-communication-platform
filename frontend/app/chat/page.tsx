"use client";
import { Button } from "@/components/ui/button";
import { io } from "socket.io-client";
import { useEffect } from "react";
const socket = io("http://localhost:5001");

function onClick() {
  socket.emit("message", "Hello, server!");
  console.log("Message sent");
}

export default function Chat() {
  useEffect(() => {
    // Connection listener
    socket.on("connect", () => {
      console.log("Connected to server");
    });

    // Message listener
    socket.on("message", (message) => {
      console.log("Received message:", message);
    });

    // Cleanup function to remove listeners when component unmounts
    return () => {
      socket.off("connect");
      socket.off("message");
    };
  }, []);

  return <Button onClick={onClick}>Chat</Button>;
}
