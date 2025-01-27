"use client";
import { Button } from "@/components/ui/button";
import { useEffect, useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Manager } from "socket.io-client";
import { useRouter } from "next/navigation";

const manager = new Manager("http://localhost:5001");
const socket = manager.socket("/");

interface Message {
  _id: string;
  message: string;
  sender: string;
  timestamp?: string;
}

interface MessageProps {
  message: string;
  sender: string;
}

// TODO: Update this to match the user once we have authentication
export default function Chat({
  roomName = "General Chat",
}: {
  roomName: string;
}) {
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [user, setUser] = useState<string | undefined>(undefined);

  function onClick(message: string) {
    if (message.trim() === "") return; // Check if the message is empty

    // TODO: Update this to match the user once we have authentication
    socket.emit("message", { message, sender: user, _id: crypto.randomUUID() });
    setMessage("");
  }
  useEffect(() => {
    // Connection listener
    socket.on("connect", () => {
      // Need to update this to match to the user once we have authentication
      setUser(socket.id);
    });

    // Message listener for new messages
    socket.on("message", (message) => {
      console.log(message);
      setMessages((prevMessages) => [...prevMessages, message]);
    });

    // Cleanup function
    return () => {
      socket.off("connect");
      socket.off("message");
    };
  }, []);

  // Add this new function to scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Add effect to scroll on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const ReceivedMessage = ({ message, sender }: MessageProps) => (
    <div className="flex items-end space-x-2">
      <Avatar className="bg-gray-100 dark:bg-gray-800">
        <AvatarFallback>{sender?.charAt(0)}</AvatarFallback>
      </Avatar>
      <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
        <p className="text-sm">{message}</p>
      </div>
    </div>
  );

  const SentMessage = ({ message, sender }: MessageProps) => (
    <div className="flex items-end justify-end space-x-2">
      <div className="p-2 rounded-lg bg-blue-500 text-white">
        <p className="text-sm">{message}</p>
      </div>
      <Avatar className="bg-gray-100 dark:bg-gray-800">
        <AvatarFallback>{sender?.charAt(0)}</AvatarFallback>
      </Avatar>
    </div>
  );

  return (
    <div className="flex flex-col h-screen">
      <header className="flex items-center justify-between px-4 py-2 border-b">
        <h1 className="text-lg font-semibold">{roomName}</h1>
        <Button
          variant="default"
          size="sm"
          onClick={() => {
            router.push("/");
          }}
        >
          Leave Chat
        </Button>
      </header>
      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) =>
          msg.sender === user ? (
            <SentMessage
              key={msg._id}
              message={msg.message}
              sender={msg.sender}
            />
          ) : (
            <ReceivedMessage
              key={msg._id}
              message={msg.message}
              sender={msg.sender}
            />
          ),
        )}
        <div ref={messagesEndRef} />
      </main>
      <footer className="flex items-center space-x-2 border-t rounded-lg shadow-lg p-4 pb-15">
        <Input
          className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-lg shadow-lg p-4 h-full border-cyan-950"
          placeholder="Type a message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onClick(message)}
        />
        <Button
          className="w-20 h-full"
          variant="default"
          size="lg"
          onClick={() => onClick(message)}
        >
          Send
        </Button>
      </footer>
    </div>
  );
}
