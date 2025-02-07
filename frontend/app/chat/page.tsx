"use client";
import { Button } from "@/components/ui/button";
import { useEffect, useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Manager } from "socket.io-client";
import Sidebar from "@/components/ui/sidebar";
import ChatInfo from "@/components/ui/chatInfo";
import SearchBar from "@/components/ui/search-bar";
import { useAuth } from "@/hooks/useAuth";
import { Pencil } from "lucide-react";
import NavBar from "../navBar";

const manager = new Manager("http://localhost:5001");
const socket = manager.socket("/");

interface Message {
  _id: string;
  content: string;
  sender: string;
  senderName: string;
  timestamp?: string;
  isEditing?: boolean;
}

interface MessageProps {
  message: Message;
  sender: string;
  senderName: string;
}

interface UserResult {
  _id: string;
  username: string;
  email: string;
}

interface MessageResult {
  _id: string;
  content: string;
  senderName: string;
}

export default function Chat({
  roomName = "General Chat",
}: {
  roomName?: string;
}) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [userResults, setUserResults] = useState<UserResult[]>([]);
  const [messageResults, setMessageResults] = useState<MessageResult[]>([]);
  const [editingMessage, setEditingMessage] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  // Function to handle search
  const handleSearch = async (query: string) => {
    console.log("Search query:", query);

    if (!query.trim()) {
      setUserResults([]);
      setMessageResults([]);
      return;
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/searchbar?query=${query}`,
      );
      if (!response.ok) throw new Error("Failed to fetch search results");

      const data = await response.json();
      setUserResults(data.users || []);
      setMessageResults(data.messages || []);
    } catch (error) {
      console.error("Error searching:", error);
      setUserResults([]);
      setMessageResults([]);
    }
  };

  function onClick(message: string) {
    if (!user || message.trim() === "") return;

    socket.emit("message", {
      content: message,
      sender: user.userID,
      senderName: user.username,
    });
    setMessage("");
  }

  const handleUpdateMessage = (messageId: string, newContent: string) => {
    if (!user || newContent.trim() === "") return;

    socket.emit("updateMessage", {
      messageId,
      newContent,
      userId: user.userID,
    });
    setEditingMessage(null);
    setEditContent("");
  };

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      window.location.href = "/signin";
      return;
    }

    if (!user) return;

    // Ensure socket is connected
    if (!socket.connected) {
      socket.connect();
    }

    // Connection listener
    socket.on("connect", () => {
      console.log("Connected to socket with user:", user.username);
      // Request message history when connected
      socket.emit("get_message_history");
    });

    // Add message history listener
    socket.on("message_history", (history: Message[]) => {
      console.log("Received message history:", history);
      setMessages(history);
      // Turn off message history listener
      socket.off("message_history");
    });

    // Message listener for new messages
    socket.on("message", (message: Message) => {
      setMessages((prevMessages) => [...prevMessages, message]);
    });

    // Add new socket listener for message updates
    socket.on("messageUpdated", (updatedMessage: Message) => {
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg._id === updatedMessage._id
            ? { ...msg, content: updatedMessage.content }
            : msg,
        ),
      );
    });

    // Immediately request message history if already connected
    if (socket.connected) {
      socket.emit("get_message_history");
    }

    // Cleanup function
    return () => {
      socket.off("connect");
      socket.off("message");
      socket.off("message_history");
      socket.off("messageUpdated");
    };
  }, [user, isAuthenticated, isLoading]);

  // Add this new function to scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Add effect to scroll on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!isLoading && !isAuthenticated) {
    return null;
  }

  const ReceivedMessage = ({ message, senderName }: MessageProps) => (
    <div className="flex items-end space-x-2">
      <Avatar className="bg-gray-100 dark:bg-gray-800">
        <AvatarFallback>{senderName?.charAt(0)?.toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="flex flex-col gap-1">
        <span className="text-xs text-gray-500">{senderName}</span>
        <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
          <p className="text-sm">{message.content}</p>
        </div>
      </div>
    </div>
  );

  const SentMessage = ({ message, senderName }: MessageProps) => (
    <div className="flex items-end justify-end space-x-2">
      <div className="flex flex-col items-end gap-1 relative group">
        <span className="text-xs text-gray-500">{senderName}</span>
        {editingMessage === message._id ? (
          <div className="flex gap-2">
            <Input
              className="min-w-[200px]"
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleUpdateMessage(message._id, editContent);
                } else if (e.key === "Escape") {
                  setEditingMessage(null);
                  setEditContent("");
                }
              }}
              autoFocus
            />
            <Button
              size="sm"
              onClick={() => handleUpdateMessage(message._id, editContent)}
            >
              Save
            </Button>
          </div>
        ) : (
          <div className="p-2 rounded-lg bg-blue-500 text-white relative">
            <p className="text-sm">{message.content}</p>
            {user?.userID === message.sender && (
              <button
                onClick={() => {
                  setEditingMessage(message._id);
                  setEditContent(message.content);
                }}
                className="absolute -left-6 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Pencil className="h-4 w-4 text-gray-500 hover:text-gray-700" />
              </button>
            )}
          </div>
        )}
      </div>
      <Avatar className="bg-gray-100 dark:bg-gray-800">
        <AvatarFallback>{senderName?.charAt(0)?.toUpperCase()}</AvatarFallback>
      </Avatar>
    </div>
  );

  return (
    <div className="flex w-full h-screen">
      {/* Sidebar */}
      <div className="w-64 h-screen bg-gradient-to-t from-violet-500 to-fuchsia-500">
        <Sidebar />
      </div>

      <div className="w-[5px] bg-gray-600"></div>

      {/* Main Chat Window */}
      <div className="flex-1 flex flex-col h-screen">
        {/* Search Bar */}
        <SearchBar
          onSearch={handleSearch}
          userResults={userResults}
          messageResults={messageResults}
        />

        <header className="flex-none flex items-center justify-between px-4 py-2 border-b">
          <h1 className="text-lg font-semibold">{roomName}</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              Welcome, {user.username}!
            </span>
            <NavBar />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) =>
            msg.sender === user.userID ? (
              <SentMessage
                key={msg._id}
                message={msg}
                sender={msg.sender}
                senderName={msg.senderName}
              />
            ) : (
              <ReceivedMessage
                key={msg._id}
                message={msg}
                sender={msg.sender}
                senderName={msg.senderName}
              />
            ),
          )}
          <div ref={messagesEndRef} />
        </main>

        <footer className="flex-none flex items-center space-x-2 border-t p-4 bg-white">
          <Input
            className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-lg shadow-lg p-4 border-cyan-950"
            placeholder="Type a message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onClick(message)}
          />
          <Button
            className="w-20"
            variant="default"
            size="lg"
            onClick={() => onClick(message)}
          >
            Send
          </Button>
        </footer>
      </div>

      {/* Chat Info Panel */}
      <div className="w-64">
        <ChatInfo />
      </div>
    </div>
  );
}
