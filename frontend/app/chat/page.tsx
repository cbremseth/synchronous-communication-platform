"use client";
import { Button } from "@/components/ui/button";
import { useEffect, useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Manager } from "socket.io-client";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/ui/sidebar";
import ChatInfo from "@/components/ui/chatInfo";
import SearchBar from "@/components/ui/search-bar";

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
  const [searchResults, setSearchResults] = useState<Message[]>([]);

  const handleSearch = (query: string) => {
    console.log("Search query:", query);

    // Filter messages that match the query
    const results = messages.filter((msg) =>
      msg.message.toLowerCase().includes(query.toLowerCase()),
    );

    setSearchResults(results); // Update search results
  };

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

  // const SearchResult = () => (
  //   <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 mt-2">
  //     <h2 className="text-sm font-semibold mb-2">Search Results:</h2>
  //     {searchResults.length > 0 ? (
  //       <ul className="list-none space-y-1">
  //         {searchResults.map((result) => (
  //           <li key={result._id} className="text-sm">
  //             {result.sender}
  //           </li>
  //         ))}
  //       </ul>
  //     ) : (
  //       <p className="text-gray-500 text-sm">No results found.</p>
  //     )}
  //   </div>
  // );

  return (
    <div className="flex w-full h-full">
      {/* Sidebar */}
      <div className="max-w-xs h-full bg-gradient-to-t from-violet-500 to-fuchsia-500">
        <Sidebar />
      </div>

      <div className="w-[5px] bg-gray-600"></div>

      {/* Main Chat Window */}
      <div className="flex-1 flex flex-col">
        {/* Search Bar */}
        <SearchBar placeholder="Search something..." onSearch={handleSearch} />

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 mt-2">
            <h2 className="text-sm font-semibold">Search Results:</h2>
            <ul className="list-disc pl-5">
              {searchResults.map((result) => (
                <li key={result._id} className="text-sm">
                  {result.sender}
                </li>
              ))}
            </ul>
          </div>
        )}

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
        <footer className="flex items-center space-x-2 border-t p-4">
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
      <div className="">
        <ChatInfo />
      </div>
    </div>
  );
}
