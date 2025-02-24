"use client";

import { Button } from "@/components/ui/button";
import { useEffect, useState, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import Sidebar from "@/components/ui/sidebar";
import ChatInfo from "@/components/ui/chatInfo";
import { FileInfo } from "@/components/ui/chatInfo";
import SearchBar from "@/components/ui/search-bar";
import { useAuth } from "@/hooks/useAuth";
import { getOrCreateGeneralChannel } from "@/app/actions/channelActions";
import NavBar from "../navBar";
import { useRouter } from "next/navigation";
import MessageReactions from "@/components/ui/message-reactions";
import { useSocketContext } from "../../context/SocketContext";
import { Upload, Smile } from "lucide-react";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";
import Emoji from "@emoji-mart/react";
import { init, SearchIndex } from "emoji-mart";

init({ data });

// Use API URL dynamically based on whether the app is running inside Docker or locally
const API_BASE_URL =
  typeof window !== "undefined" && window.location.hostname === "localhost"
    ? "http://localhost:5001"
    : process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

interface Message {
  _id: string;
  content: string;
  sender: string;
  senderName: string;
  timestamp?: string;
  isEditing?: boolean;
  channelId: string;
  reactions: {
    [emoji: string]: {
      count: number; // Number of times this emoji has been reacted to
      users: string[]; // List of user IDs who reacted with this emoji
    };
  };
}

interface MessageProps {
  message: string;
  sender: string;
  senderName: string;
  messageId: string;
  reactions: {
    [emoji: string]: {
      count: number;
      users: string[];
    };
  };
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
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const socket = useSocketContext();

  // Add function to fetch general channel
  const fetchGeneralChannel = useCallback(async () => {
    try {
      if (!user) return;
      const generalChannel = await getOrCreateGeneralChannel(user.userID);
      console.log("generalChannel", generalChannel);
      setCurrentChannelId(generalChannel._id);
    } catch (error) {
      console.error("Error fetching general channel:", error);
    }
  }, [user]);

  useEffect(() => {
    if (!channelId && roomName === "General Chat") {
      fetchGeneralChannel();
    } else {
      setCurrentChannelId(channelId);
    }
  }, [channelId, roomName, user, fetchGeneralChannel]);

  // Handle fetching files for current channel
  useEffect(() => {
    if (currentChannelId) {
      fetch(`${API_BASE_URL}/api/files/${currentChannelId}`)
        .then((response) => response.json())
        .then((data) => {
          setFiles(data);
          console.log("All files loaded for channel", currentChannelId);
        })
        .catch((err) => {
          console.log(
            "Failed to load files for channel",
            err,
            currentChannelId,
          );
          setFiles([]);
        });
    }
  }, [currentChannelId]);

  // Function to handle search functionality in searchbar
  const handleSearch = async (query: string) => {
    console.log("Search query:", query);

    if (!query.trim()) {
      setUserResults([]);
      setMessageResults([]);
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/searchbar?query=${query}`,
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

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    console.log("Preparing to upload file in channel: ", currentChannelId);
    const file = event.target.files?.[0];
    if (!file || !user || !currentChannelId) {
      console.error("Upload failed: Missing user or channel ID");
      return;
    }
    console.log("Information about file:", file);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("senderId", user.userID);
    formData.append("channelId", currentChannelId);
    formData.append("senderName", user.username);

    try {
      const response = await fetch(`${API_BASE_URL}/api/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        if (response.status === 401) {
          alert("Error: Channel not found.");
        } else if (response.status === 402) {
          alert(
            `Error: Invalid file size limit, current file size: ${
              file.size / 1024
            } KB.`,
          );
        } else if (response.status === 500) {
          alert("Error: Server error. Please try again later.");
        } else {
          alert(`Unexpected error: ${data.message || "Unknown error"}`);
        }
        return;
      }

      console.log("Log: File uploaded successfully");
    } catch (error) {
      console.error("Error uploading file:", error);
    }
  };

  useEffect(() => {
    const handleFileUpload = (file: FileInfo) => {
      console.log("Received a file upload event:", file);
      setFiles((prevFiles) => [...prevFiles, file]);
    };

    // Listen for the file_uploaded event
    socket?.on("file_uploaded", handleFileUpload);

    return () => {
      socket?.off("file_uploaded", handleFileUpload);
    };
  }, [currentChannelId]);

  const onClick = async () => {
    if (!user || !currentChannelId || message.trim() === "") return;

    // Convert shortcodes before sending
    const finalMessage = await convertShortcodesToEmoji(message);

    console.log("converted messages with shortcodes: ", finalMessage);
    socket?.emit("message", {
      content: finalMessage,
      sender: user.userID,
      senderName: user.username,
      channelId: currentChannelId,
    });
    setMessage("");
  };

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
    if (!socket?.connected) {
      socket?.connect();
    }

    // Clear messages when switching channels
    setMessages([]);

    // Join the channel
    socket?.emit("join_channel", currentChannelId);

    // Add message history listener
    socket?.on("message_history", (history: Message[]) => {
      console.log("Received message history:", history);
      setMessages(history);
    });

    // Message listener for new messages
    socket?.on("message", (message: Message) => {
      if (message.channelId === currentChannelId) {
        setMessages((prevMessages) => [...prevMessages, message]);
      }
    });

    // Add new socket listener for message updates
    socket?.on("messageUpdated", (updatedMessage: Message) => {
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg._id === updatedMessage._id
            ? { ...msg, content: updatedMessage.content }
            : msg,
        ),
      );
    });

    // Immediately request message history if already connected
    if (socket?.connected) {
      socket?.emit("get_message_history");
    }

    // Cleanup function
    return () => {
      socket?.off("connect");
      socket?.off("message");
      socket?.off("message_history");
    };
  }, [user, isAuthenticated, isLoading, currentChannelId, router, socket]);

  useEffect(() => {
    socket?.on("reaction_updated", ({ messageId, reactions }) => {
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg._id === messageId ? { ...msg, reactions } : msg,
        ),
      );
    });

    return () => {
      socket?.off("reaction_updated");
    };
  }, []);

  // Function to handle emoji reactions
  const handleReaction = (messageId: string, emoji: string) => {
    if (!user) return;

    socket?.emit("add_reaction", {
      messageId,
      emoji,
      userId: user.userID,
    });

    setMessages((prevMessages) =>
      prevMessages.map((msg) =>
        msg._id === messageId
          ? {
              ...msg,
              reactions: {
                ...msg.reactions,
                [emoji]: {
                  count: (msg.reactions?.[emoji]?.count || 0) + 1,
                  users: [
                    ...(msg.reactions?.[emoji]?.users || []),
                    user.userID,
                  ],
                },
              },
            }
          : msg,
      ),
    );
  };

  // Fetch reaction details for a message
  const getReactionDetails = async (messageId: string) => {
    try {
      if (!messageId) {
        console.error("Invalid messageId:", messageId);
        return {};
      }

      console.log("Fetching reactions for messageId:", messageId);

      const response = await fetch(
        `${API_BASE_URL}/api/reactionDetails/${messageId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to fetch reaction details");
      }

      const data = await response.json();
      return data.reactionDetails;
    } catch (error) {
      console.error("Error fetching reaction details:", error);
      return {};
    }
  };

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

  const ReceivedMessage = ({
    message,
    senderName,
    messageId,
    reactions,
  }: MessageProps) => (
    <div className="flex items-end space-x-2">
      <Avatar className="bg-gray-100 dark:bg-gray-800">
        <AvatarFallback>{senderName?.charAt(0)?.toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="flex flex-col gap-1">
        <span className="text-xs text-gray-500">{senderName}</span>
        <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
          <p className="text-sm">{message}</p>
          <MessageReactions
            messageId={messageId}
            reactions={reactions || {}}
            onReact={handleReaction}
            getReactionDetails={getReactionDetails}
          />
        </div>
      </div>
    </div>
  );

  const SentMessage = ({
    message,
    senderName,
    messageId,
    reactions,
  }: MessageProps) => (
    <div className="flex items-end justify-end space-x-2">
      <div className="flex flex-col items-end gap-1">
        <span className="text-xs text-gray-500">{senderName}</span>
        <div className="p-2 rounded-lg bg-blue-500 text-white">
          <p className="text-sm">{message}</p>
          <MessageReactions
            messageId={messageId}
            reactions={reactions || {}}
            onReact={handleReaction}
            getReactionDetails={getReactionDetails}
          />
        </div>
      </div>
      <Avatar className="bg-gray-100 dark:bg-gray-800">
        <AvatarFallback>{senderName?.charAt(0)?.toUpperCase()}</AvatarFallback>
      </Avatar>
    </div>
  );

  // Function to replace shortcodes i.e ":smile:" with actual emojis
  const convertShortcodesToEmoji = async (text: string) => {
    // Regular expression to find :emoji_shortcodes:
    const emojiRegex = /:([a-zA-Z0-9_+-]+):/g;

    // Extract all matches
    const matches = [...text.matchAll(emojiRegex)];

    // If no shortcodes found, return original text
    if (matches.length === 0) return text;

    // Process all matches asynchronously
    const replacedTextArray = await Promise.all(
      matches.map(async (match) => {
        const shortcode = match[1]; // Extract emoji name from match
        const emojis = await SearchIndex.search(shortcode); // Search for the emoji

        return emojis && emojis.length > 0
          ? emojis[0].skins[0].native
          : match[0]; // Replace if found, else keep original
      }),
    );

    // Replace the shortcodes in text with the actual emoji
    let replacedText = text;
    matches.forEach((match, index) => {
      replacedText = replacedText.replace(match[0], replacedTextArray[index]);
    });

    console.log("Converted Text:", replacedText);
    return replacedText;
  };

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
                message={msg.content}
                sender={msg.sender}
                senderName={msg.senderName}
                messageId={msg._id}
                reactions={msg.reactions || {}}
              />
            ) : (
              <ReceivedMessage
                key={msg._id}
                message={msg.content}
                sender={msg.sender}
                senderName={msg.senderName}
                messageId={msg._id}
                reactions={msg.reactions || {}}
              />
            ),
          )}
          <div ref={messagesEndRef} />
        </main>

        <footer className="flex-none flex items-center space-x-2 border-t p-4 bg-white relative">
          <div className="relative flex-1">
            <Input
              className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-lg shadow-lg p-4 border-cyan-950"
              placeholder="Type a message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onClick()}
            />
            {/* Emoji Picker Button */}
            <button
              onClick={() => setShowPicker((prev) => !prev)}
              className="absolute right-2 top-2"
            >
              <Smile className="w-6 h-5 text-gray-600" />
            </button>

            {/* Emoji Picker Dropdown */}
            {showPicker && (
              <div
                ref={pickerRef}
                className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
                onClick={() => setShowPicker(false)}
              >
                <div
                  ref={pickerRef}
                  className="bg-gray-900 p-4 rounded-lg shadow-lg"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Picker
                    data={data}
                    onEmojiSelect={(emoji: typeof Emoji) => {
                      setMessage((prev) => prev + emoji.native);
                      setShowPicker(false);
                    }}
                    theme="dark"
                    perLine={6}
                    emojiSize={22}
                  />
                </div>
              </div>
            )}
          </div>
          <label className="cursor-pointer">
            <Upload className="w-6 h-6 text-gray-600" />
            <input type="file" className="hidden" onChange={handleFileUpload} />
          </label>
          <Button
            className="w-20"
            variant="default"
            size="lg"
            onClick={() => onClick()}
          >
            Send
          </Button>
        </footer>
      </div>

      <div className="w-64">
        {/* Chat Info Panel */}
        {currentChannelId && (
          <ChatInfo
            channelId={currentChannelId}
            files={files}
            API_BASE_URL={API_BASE_URL}
            current_userID={user.userID}
          />
        )}
      </div>
    </div>
  );
}
