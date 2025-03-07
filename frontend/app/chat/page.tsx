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
import { Download, FileJson, FileType } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import MessageReactions from "@/components/ui/message-reactions";
import { useSocketContext } from "../../context/SocketContext";
import { Upload, Smile, Trash } from "lucide-react";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";
import Emoji from "@emoji-mart/react";
import { init, SearchIndex } from "emoji-mart";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm"; // Supports GitHub-flavored Markdown (tables, strikethrough, etc.)

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
  mentions?: string[];
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
  const messageRefs = useRef<{ [key: string]: HTMLDivElement }>({});
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [showPicker, setShowPicker] = useState(false);

  const pickerRef = useRef<HTMLDivElement>(null);
  const socket = useSocketContext();
  const [channels, setChannels] = useState([]);

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

  // Fetch initial channels from API
  const fetchChannels = async () => {
    const res = await fetch(`${API_BASE_URL}/api/channels`);
    const data = await res.json();
    setChannels(data);
  };

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
    const highlightMessageId = urlParams.get("highlight");

    if (highlightMessageId && messages.length > 0) {
      // Small delay to ensure the message elements are rendered
      setTimeout(() => {
        scrollToMessage(highlightMessageId);
      }, 100);

      // Clean up the URL without triggering a navigation
      window.history.replaceState({}, "", `/chat/${currentChannelId}`);
    }
  }, [messages, currentChannelId]); // Depend on messages and channelId

  // Add scroll to bottom effect
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleDeleteMessage = async (messageId: string) => {
    if (!user) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/messages/${messageId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ userId: user.userID }), // Ensure user is authenticated
        },
      );

      if (!response.ok) {
        console.error("Failed to delete message");
        return;
      }

      // Remove message from UI
      setMessages((prevMessages) =>
        prevMessages.filter((msg) => msg._id !== messageId),
      );

      console.log("Message deleted successfully");
    } catch (error) {
      console.error("Error deleting message:", error);
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
            `Error: Invalid file size limit, current file size: ${file.size / 1024
            } KB.`,
          );
        } else if (response.status === 500) {
          alert("Error: Server error. Please try again later.");
        } else {
          alert(`Unexpected error: ${data.message || "Unknown error"}`);
        }
        return;
      }
      console.log("File upload request sent successfully");

      console.log("Log: File uploaded successfully");
    } catch (error) {
      console.error("Error uploading file:", error);
    }
  };

  const handleFileUploadEvent = useCallback((file: FileInfo) => {
    console.log("Received a file upload event:", file);
    setFiles((prevFiles) => [...prevFiles, file]);
  }, []);

  useEffect(() => {
    // Listen for the file_uploaded event
    socket?.on("file_uploaded", handleFileUploadEvent);

    return () => {
      socket?.off("file_uploaded", handleFileUploadEvent);
    };
  }, [handleFileUploadEvent, socket]);

  const onClick = async () => {
    if (!user || !currentChannelId || message.trim() === "") return;

    // Extract mentions from message
    const mentionRegex = /@(\w+)/g;
    const mentions =
      message.match(mentionRegex)?.map((m) => m.substring(1)) || [];

    // Convert shortcodes before sending
    const finalMessage = await convertShortcodesToEmoji(message);

    socket?.emit("message", {
      content: finalMessage,
      sender: user.userID,
      senderName: user.username,
      channelId: currentChannelId,
      mentions,
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
    socket.emit("join_channel", currentChannelId, user.userID);

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

    // handle message deletion
    socket?.on("message_deleted", ({ messageId }) => {
      setMessages((prevMessages) =>
        prevMessages.filter((msg) => msg._id !== messageId),
      );
    });

    // Fetch channels initially
    fetchChannels();

    const handleChannelUpdate = (updatedChannels) => {
      console.log("Received updated channels:", updatedChannels);
      setChannels(updatedChannels); // Update state dynamically
    };

    // Listen for channel updates from the server
    socket?.on("channelUpdated", handleChannelUpdate);

    // Cleanup function
    return () => {
      socket?.off("connect");
      socket?.off("message");
      socket?.off("message_history");
      socket?.off("message_deleted");
      socket?.off("channelUpdated", handleChannelUpdate);
    };
  }, [user, isAuthenticated, isLoading, currentChannelId, router, socket]);

  // Add this new function to scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Add effect to scroll on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Add export functions
  const exportMessages = (format: "csv" | "json") => {
    if (messages.length === 0) return;

    let exportData;
    let fileName;
    let fileType;

    if (format === "csv") {
      // Create CSV content
      const headers = "Sender,Message,Timestamp\n";
      const csvContent = messages
        .map((msg) => `"${msg.senderName}","${msg.content}","${msg.timestamp}"`)
        .join("\n");
      exportData = headers + csvContent;
      fileName = `chat-export-${new Date().toISOString()}.csv`;
      fileType = "text/csv";
    } else {
      // Create JSON content
      exportData = JSON.stringify(messages, null, 2);
      fileName = `chat-export-${new Date().toISOString()}.json`;
      fileType = "application/json";
    }

    // Create and trigger download
    const blob = new Blob([exportData], { type: fileType });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

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
          <div className="text-sm markdown-content">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{message}</ReactMarkdown>
          </div>

          <MessageReactions
            messageId={messageId}
            reactions={reactions}
            API_BASE_URL={API_BASE_URL}
            channelId={currentChannelId}
            userId={user.userID}
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
        <div className="p-2 rounded-lg bg-blue-500 text-white flex items-center gap-2">
          <div className="text-sm markdown-content">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{message}</ReactMarkdown>
          </div>
          <span className="text-black">
            <MessageReactions
              messageId={messageId}
              reactions={reactions}
              API_BASE_URL={API_BASE_URL}
              channelId={currentChannelId}
              userId={user.userID}
            />
          </span>
          <button onClick={() => handleDeleteMessage(messageId)}>
            <Trash className="w-4 h-4 text-white hover:text-red-500 cursor-pointer" />
          </button>
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

        // TODO: currently hard-coded skin-tone value to 1 (range from 1-6)
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
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold">{roomName}</h1>
          </div>
          <div className="flex items-center gap-4">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon" className="h-8 w-8">
                        <Download className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuLabel>Export Chat</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => exportMessages("csv")}
                        className="flex items-center"
                      >
                        <FileType className="mr-2 h-4 w-4" />
                        <span>Export as CSV</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => exportMessages("json")}
                        className="flex items-center"
                      >
                        <FileJson className="mr-2 h-4 w-4" />
                        <span>Export as JSON</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Export chat history</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <span className="text-sm text-gray-600">
              Welcome, {user?.username || "Guest"}!
            </span>
            <NavBar />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => {
            const isSentByUser = msg.sender === user?.userID;
            const MessageComponent = isSentByUser
              ? SentMessage
              : ReceivedMessage;

            return (
              <div
                key={msg._id}
                ref={(el) => {
                  if (el) messageRefs.current[msg._id] = el;
                }}
                className="p-2"
              >
                <MessageComponent
                  message={msg.content}
                  sender={msg.sender}
                  senderName={msg.senderName}
                  messageId={msg._id}
                  reactions={msg.reactions || {}}
                />
              </div>
            );
          })}
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
