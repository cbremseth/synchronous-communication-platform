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
import Link from "next/link";

const manager = new Manager("http://localhost:5001");
const socket = manager.socket("/");

interface Message {
  _id: string;
  content: string;
  sender: string;
  senderName: string;
  timestamp?: string;
}

interface MessageProps {
  message: string;
  sender: string;
  senderName: string;
}

interface UserResult{
  id: string,
  email: string,
  username: string,
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
  const [userSearchResults, setUserSearchResults] = useState<UserResult[]>([]);
  const [messageSearchResults, setMessageSearchResults] = useState<Message[]>([]);

const handleSearch = async (query: string) => {
  console.log("Search query:", query);
  if (!query.trim()) {
    setUserSearchResults([]);
    setMessageSearchResults([]);
    return;
  }

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/searchbar?query=${query}`);

    if (!response.ok) {
      throw new Error("Failed to fetch search results");
    }
    const data = await response.json();

    // Update state with search results
    setUserSearchResults(data.users || []);
    setMessageSearchResults(data.messages || []);
  } catch (error) {
    console.error("Error searching:", error);
    setUserSearchResults([]);
    setMessageSearchResults([]);
  }
};

  function onClick(message: string) {
    if (!user || message.trim() === "") return;

    socket.emit("message", {
      content: message,
      sender: user.userID,
      senderName: user.username,
      _id: crypto.randomUUID(),
    });
    setMessage("");
  }

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

    // Immediately request message history if already connected
    if (socket.connected) {
      socket.emit("get_message_history");
    }

    // Cleanup function
    return () => {
      socket.off("connect");
      socket.off("message");
      socket.off("message_history");
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
          <p className="text-sm">{message}</p>
        </div>
      </div>
    </div>
  );

  const SentMessage = ({ message, senderName }: MessageProps) => (
    <div className="flex items-end justify-end space-x-2">
      <div className="flex flex-col items-end gap-1">
        <span className="text-xs text-gray-500">{senderName}</span>
        <div className="p-2 rounded-lg bg-blue-500 text-white">
          <p className="text-sm">{message}</p>
        </div>
      </div>
      <Avatar className="bg-gray-100 dark:bg-gray-800">
        <AvatarFallback>{senderName?.charAt(0)?.toUpperCase()}</AvatarFallback>
      </Avatar>
    </div>
  );

  return (
    <div className="flex w-full h-screen overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 h-full bg-gradient-to-t from-violet-500 to-fuchsia-500">
        <Sidebar />
      </div>

      <div className="w-[5px] bg-gray-600"></div>

      {/* Main Chat Window */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Search Bar */}
        <div className="flex-none">
          <SearchBar placeholder="Search messages..." onSearch={handleSearch} />

          {/* Search Results */}
          <div className="mt-2">
            {/* Display User Profiles if Found */}
            {userSearchResults.length > 0 && (
              <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
                <h2 className="text-sm font-semibold">Users:</h2>
                <ul className="list-disc pl-5">
                  {userSearchResults.map((user) => (
                    <li key={user._id} className="text-sm">
                      <Link href={`/profile/${user._id}`} className="text-blue-500 hover:underline">
                        <strong>{user.username}</strong> - {user.email}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            </div>

  {/* Display Messages if Found */}
  {messageSearchResults.length > 0 && (
    <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 mt-2">
      <h2 className="text-sm font-semibold">Messages:</h2>
      <ul className="list-disc pl-5">
        {messageSearchResults.map((msg) => (
          <li key={msg._id} className="text-sm">
            <strong>{msg.senderName}:</strong> {msg.content}
          </li>
        ))}
      </ul>
    </div>
  )}
</div>


        <header className="flex-none flex items-center justify-between px-4 py-2 border-b">
          <h1 className="text-lg font-semibold">{roomName}</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              Welcome, {user.username}!
            </span>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => (window.location.href = "/signin")}
            >
              Sign Out
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) =>
            msg.sender === user.userID ? (
              <SentMessage
                key={msg._id}
                message={msg.content}
                sender={msg.sender}
                senderName={msg.senderName}
              />
            ) : (
              <ReceivedMessage
                key={msg._id}
                message={msg.content}
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
