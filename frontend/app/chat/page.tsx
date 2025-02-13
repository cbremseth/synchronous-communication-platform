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
import { getOrCreateGeneralChannel } from "@/app/actions/channelActions";
import NavBar from "../navBar";
import { useRouter } from "next/navigation";

const manager = new Manager("http://localhost:5001");
const socket = manager.socket("/");

interface Message {
  _id: string;
  content: string;
  sender: string;
  senderName: string;
  timestamp?: string;
  isEditing?: boolean;
  channelId: string;
  mentions?: string[];
}

interface MessageProps {
  message: string;
  sender: string;
  senderName: string;
}

// Interfaces for search results: Users
interface UserResult {
  _id: string;
  username: string;
  email: string;
}

// Interface for search results: Messages
interface MessageResult {
  _id: string;
  content: string;
  senderName: string;
}

export default function Chat({
  roomName = "General Chat",
  channelId,
}: {
  roomName?: string;
  channelId?: string;
}) {
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [userResults, setUserResults] = useState<UserResult[]>([]);
  const [messageResults, setMessageResults] = useState<MessageResult[]>([]);
  const [currentChannelId, setCurrentChannelId] = useState<string | undefined>(
    channelId,
  );
  const messageRefs = useRef<{ [key: string]: HTMLDivElement }>({});

  // Add function to fetch general channel
  const fetchGeneralChannel = async () => {
    try {
      if (!user) return;
      const generalChannel = await getOrCreateGeneralChannel(user.userID);
      console.log("generalChannel", generalChannel);
      setCurrentChannelId(generalChannel._id);
    } catch (error) {
      console.error("Error fetching general channel:", error);
    }
  };

  useEffect(() => {
    if (!channelId && roomName === "General Chat") {
      fetchGeneralChannel();
    } else {
      setCurrentChannelId(channelId);
    }
  }, [channelId, roomName, user]);

  // Function to handle search functionality in searchbar
  const handleSearch = async (query: string) => {
    console.log("Search query:", query);

    if (!query.trim()) {
      setUserResults([]);
      setMessageResults([]);
      return;
    }
    // Use API URL dynamically based on whether the app is running inside Docker or locally
    const apiBaseUrl =
      typeof window !== "undefined" && window.location.hostname === "localhost"
        ? "http://localhost:5001"
        : process.env.NEXT_PUBLIC_API_URL;

    try {
      const response = await fetch(
        `${apiBaseUrl}/api/searchbar?query=${query}`,
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

  // Add function to scroll to message
  const scrollToMessage = (messageId: string) => {
    const messageElement = messageRefs.current[messageId];
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  // Add effect to handle message highlighting from URL
  useEffect(() => {
    // Check for message ID in URL query params
    const urlParams = new URLSearchParams(window.location.search);
    const highlightMessageId = urlParams.get('highlight');
    
    if (highlightMessageId && messages.length > 0) {
      // Small delay to ensure the message elements are rendered
      setTimeout(() => {
        scrollToMessage(highlightMessageId);
      }, 100);
      
      // Clean up the URL without triggering a navigation
      window.history.replaceState({}, '', `/chat/${currentChannelId}`);
    }
  }, [messages, currentChannelId]); // Depend on messages and channelId

  // Add scroll to bottom effect
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function onClick(message: string) {
    if (!user || !currentChannelId || message.trim() === "") return;

    // Extract mentions from message
    const mentionRegex = /@(\w+)/g;
    const mentions = message.match(mentionRegex)?.map(m => m.substring(1)) || [];

    socket.emit("message", {
      content: message,
      sender: user.userID,
      senderName: user.username,
      channelId: currentChannelId,
      mentions,
    });
    setMessage("");
  }

  useEffect(() => {
    console.log("Auth state:", { user, isLoading, isAuthenticated });
    if (!isLoading && !isAuthenticated) {
      console.log("isLoading:", isLoading);
      console.log("isAuthenticated:", isAuthenticated);
      router.push("/signin");
      return;
    }

    if (!user || !currentChannelId) return;

    // Ensure socket is connected
    if (!socket.connected) {
      socket.connect();
    }

    // Clear messages when switching channels
    setMessages([]);

    // Join the channel
    socket.emit("join_channel", currentChannelId, user.userID);

    // Add message history listener
    socket.on("message_history", (history: Message[]) => {
      console.log("Received message history:", history);
      setMessages(history);
    });

    // Message listener for new messages
    socket.on("message", (message: Message) => {
      if (message.channelId === currentChannelId) {
        setMessages((prevMessages) => [...prevMessages, message]);
      }
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
    };
  }, [user, isAuthenticated, isLoading, currentChannelId]);

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
    <div className="flex w-full h-screen">
      {/* Sidebar */}
      <div className="w-64 h-screen bg-gradient-to-t from-violet-500 to-fuchsia-500">
        <Sidebar />
      </div>

      <div className="w-[5px] bg-gray-600"></div>

      {/* Main Chat Window */}
      <div className="flex-1 flex flex-col h-screen">
        <div className="w-full max-w-md mx-auto">
          {/* Search Bar */}
          <SearchBar
            onSearch={handleSearch}
            userResults={userResults}
            messageResults={messageResults}
          />
        </div>

        <header className="flex-none flex items-center justify-between px-4 py-2 border-b">
          <h1 className="text-lg font-semibold">{roomName}</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              Welcome, {user?.username || "Guest"}!
            </span>
            <NavBar />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => {
            const isSentByUser = msg.sender === user?.userID;
            const MessageComponent = isSentByUser ? SentMessage : ReceivedMessage;

            return (
              <div
                key={msg._id}
                ref={el => {
                  if (el) messageRefs.current[msg._id] = el;
                }}
                className="p-2"
              >
                <MessageComponent
                  message={msg.content}
                  sender={msg.sender}
                  senderName={msg.senderName}
                />
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </main>

        <footer className="flex-none flex items-center space-x-2 border-t p-4 bg-white">
          <Input
            className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-lg shadow-lg p-4 border-cyan-950"
            placeholder="Type a message (@username to mention)"
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
