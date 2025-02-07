"use client";
import { Button } from "@/components/ui/button";
import { useEffect, useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Manager } from "socket.io-client";
import Sidebar from "@/components/ui/sidebar";
import ChatInfo from "@/components/ui/chatInfo";
// import SearchBar from "@/components/ui/search-bar";
import { useAuth } from "@/hooks/useAuth";

const manager = new Manager("http://localhost:5001");
const socket = manager.socket("/");

interface Message {
  _id: string;
  content: string;
  sender: string;
  senderName: string;
  channel: string;
  timestamp?: string;
}

interface Channel {
  _id: string;
  name: string;
}

export default function Chat() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  // const [searchResults, setSearchResults] = useState<Message[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);

  // const handleSearch = (query: string) => {
  //   const results = messages.filter((msg) =>
  //     msg.content.toLowerCase().includes(query.toLowerCase()),
  //   );
  //   setSearchResults(results);
  // };

  function sendMessage() {
    if (!user || message.trim() === "" || !selectedChannel) return;

    const newMessage: Message = {
      _id: crypto.randomUUID(),
      content: message,
      sender: user.userID,
      senderName: user.username,
      channel: selectedChannel._id,
      timestamp: new Date().toISOString(),
    };

    socket.emit("message", newMessage);
    setMessage("");
  }

  useEffect(() => {
    if (!selectedChannel) return;

    console.log("Joining channel:", selectedChannel.name);

    // join the selected channel
    socket.emit("join_channel", { channel: selectedChannel._id });

    // fetch past messages for this channel
    socket.emit("get_message_history", { channel: selectedChannel._id });

    // listen for history response and update state
    socket.on("channel_messages", (history: Message[]) => {
      console.log("Fetched messages for channel:", selectedChannel.name);
      setMessages(history);
    });

    // listen for real-time messages
    const handleNewMessage = (newMessage: Message) => {
      if (newMessage.channel === selectedChannel._id) {
        console.log("New message received:", newMessage);
        setMessages((prevMessages) => [...prevMessages, newMessage]);
      }
    };

    socket.on("message", handleNewMessage);

    // cleanup listeners when unmounting or switching channels
    return () => {
      socket.off("channel_messages");
      socket.off("message", handleNewMessage);
    };
  }, [selectedChannel]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        Loading...
      </div>
    );
  }

  if (!isLoading && !isAuthenticated) {
    return null;
  }
  const SentMessage = ({
    message,
    senderName,
  }: {
    message: string;
    senderName: string;
  }) => (
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

  const ReceivedMessage = ({
    message,
    senderName,
  }: {
    message: string;
    senderName: string;
  }) => (
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

  return (
    <div className="flex w-full h-screen overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 h-full bg-gradient-to-t from-violet-500 to-fuchsia-500">
        <Sidebar onChannelSelect={setSelectedChannel} />
      </div>

      <div className="w-[5px] bg-gray-600"></div>

      {/* Main Chat Window */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <div className="flex-none">
          {/* <SearchBar placeholder="Search messages..." onSearch={handleSearch} /> */}
        </div>

        <header className="flex-none flex items-center justify-between px-4 py-2 border-b">
          <h1 className="text-lg font-semibold">
            {selectedChannel ? selectedChannel.name : "Select a Channel"}
          </h1>
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
                senderName={msg.senderName}
              />
            ) : (
              <ReceivedMessage
                key={msg._id}
                message={msg.content}
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
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          />
          <Button
            className="w-20"
            variant="default"
            size="lg"
            onClick={sendMessage}
          >
            Send
          </Button>
        </footer>
      </div>

      <div className="w-64">
        <ChatInfo />
      </div>
    </div>
  );
}
