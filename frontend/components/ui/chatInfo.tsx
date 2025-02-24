"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { useSocketContext } from "@/context/SocketContext";
import mongoose from "mongoose";
import { EyeIcon, DownloadIcon, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Participant {
  id: string;
  username: string;
  status: "online" | "busy" | "offline";
}
export interface FileInfo {
  fileName: string;
  fileType: string;
  fileSize: number;
  senderName: string;
  fileId: mongoose.Schema.Types.ObjectId;
}

interface ChatInfoProps {
  files: FileInfo[];
  API_BASE_URL: string;
  channelId: string;
  current_userID: string;
}

const ChatInfo: React.FC<ChatInfoProps> = ({
  files,
  API_BASE_URL,
  channelId,
  current_userID,
}) => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const socket = useSocketContext();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [fileSizeLimit, setFileSizeLimit] = useState<number | "">("");

  // Fetch File Upload Limit
  const getChannelFileUploadLimit = useCallback(async () => {
    if (!channelId) return;
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/${channelId}/get-file-limit`,
      );
      if (!res.ok) throw new Error("Cannot get file upload limit");

      const data = await res.json();
      setFileSizeLimit(data.fileUpLoadLimit / 1024); // Convert bytes to KB
    } catch (error) {
      console.error("Error fetching file upload limit:", error);
    }
  }, [API_BASE_URL, channelId]);

  // Memoize the function to prevent unnecessary recreation
  const checkOwnership = useCallback(async () => {
    if (!channelId || !current_userID) return;
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/channels/${channelId}/is-owner`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ userId: current_userID }),
        },
      );
      if (!response.ok) throw new Error("Failed to check ownership");
      const data = await response.json();
      setIsOwner(data.isOwner);
    } catch (error) {
      console.error("Error checking channel ownership:", error);
    }
  }, [API_BASE_URL, channelId, current_userID]);

  useEffect(() => {
    checkOwnership();
    getChannelFileUploadLimit();
  }, [checkOwnership, getChannelFileUploadLimit]);

  useEffect(() => {
    if (!socket) return;

    socket.emit("join_channel", channelId);

    socket.on("channel_participants", (channelParticipants: Participant[]) => {
      console.log("Received participants:", channelParticipants);
      setParticipants(channelParticipants);
    });

    socket.on(
      "statusUpdated",
      ({ userId, status }: { userId: string; status: string }) => {
        console.log("Status update received:", { userId, status });
        setParticipants((prev) =>
          prev.map((p) =>
            p.id === userId
              ? { ...p, status: status as "online" | "busy" | "offline" }
              : p,
          ),
        );
      },
    );

    // Listen for real-time file upload limit updates
    socket.on("file_limit_updated", ({ fileUploadLimit }) => {
      console.log("File limit updated in real-time:", fileUploadLimit);
      setFileSizeLimit(fileUploadLimit);
    });

    return () => {
      socket.off("channel_participants");
      socket.off("statusUpdated");
      socket.off("file_limit_updated");
    };
  }, [socket, channelId]);

  const handleScroll = () => {
    if (containerRef.current) {
      const isScrolledToBottom =
        containerRef.current.scrollHeight - containerRef.current.scrollTop ===
        containerRef.current.clientHeight;
      setIsAtBottom(isScrolledToBottom);
      setShowScrollDown(!isScrolledToBottom);
    }
  };

  // Handle input of file update limit
  const handleFileSizeChange = async () => {
    if (!fileSizeLimit || fileSizeLimit <= 0 || fileSizeLimit > 100) {
      alert("File limit must be between 1KB and 100KB.");
      return;
    }
    console.log("Frontend receive file limit: ", fileSizeLimit);
    try {
      setFileSizeLimit(fileSizeLimit);
      const response = await fetch(
        `${API_BASE_URL}/api/${channelId}/update-file-limit`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileUploadLimit: fileSizeLimit,
          }),
        },
      );
      if (!response.ok) {
        throw new Error("Failed to update new file upload limit");
      }
      // Update UI if successful
      setFileSizeLimit(fileSizeLimit);
      alert("File upload limit updated successfully");
    } catch (error) {
      console.error("Error updating file upload limit:", error);
      alert("Error updating file upload limit");
    }
  };

  useEffect(() => {
    if (containerRef.current && isAtBottom) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [files, isAtBottom]);

  return (
    <div className="w-full h-full bg-gray-200 p-4 flex flex-col justify-between">
      <h2 className="text-lg font-semibold mb-4">Room Details</h2>
      <div className="flex flex-col flex-1 justify-between">
        <Card className="p-3 h-1/2 overflow-hidden">
          <h3 className="font-semibold mb-2">Participants</h3>
          <ul className="space-y-2">
            {participants.map((participant) => (
              <li key={participant.id} className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    participant.status === "online"
                      ? "bg-green-500"
                      : participant.status === "busy"
                        ? "bg-red-500"
                        : "bg-gray-500"
                  }`}
                />
                <span>{participant.username}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-3 h-1/2 mt-8 overflow-auto">
          <h3 className="font-semibold">Files</h3>
          {/* Show file upload limit input, enabled for owners and disabled for others */}
          <div className="mb-2 relative">
            <div>
              <label className="block text-sm font-medium">
                File Upload Limit (KB):
              </label>
              <span className="text-sm text-gray-500">
                {fileSizeLimit ? `${fileSizeLimit} KB` : "Loading..."}
              </span>
            </div>
            <Input
              type="number"
              value={fileSizeLimit}
              onChange={(e) => setFileSizeLimit(Number(e.target.value))}
              onKeyDown={(e) => e.key === "Enter" && handleFileSizeChange()} // Listen for Enter key
              disabled={!isOwner}
              className={`w-full border rounded-md p-2 ${
                !isOwner ? "cursor-not-allowed bg-gray-100" : ""
              }`}
              placeholder="Enter new limit"
            />
            {isOwner && <Button onClick={handleFileSizeChange}>Save</Button>}
          </div>
          <hr className="mb-4 border-t border-gray-300" />
          {files.length > 0 ? (
            <div
              ref={containerRef}
              className="overflow-auto max-h-96"
              onScroll={handleScroll}
            >
              <ul className="text-sm">
                {files.map((file, index) => (
                  <li key={index} className="py-1 border-b border-gray-300">
                    <span>
                      <a
                        href={`${API_BASE_URL}/api/preview/${file.fileId}`}
                        style={{
                          textDecoration: "none",
                          color: "#908c90",
                          pointerEvents: "none",
                        }}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {file.fileName}
                      </a>
                      <p className="text-xs">Uploaded by {file.senderName}</p>
                    </span>
                    <span>
                      <button
                        className="icon-button mr-2"
                        onClick={() =>
                          window.open(
                            `${API_BASE_URL}/api/preview/${file.fileId}`,
                            "_blank",
                          )
                        }
                        title="Preview"
                      >
                        <EyeIcon className="h-5 w-5 text-gray-500 hover:text-gray-700" />
                      </button>
                      <button
                        className="icon-button"
                        onClick={() =>
                          window.open(
                            `${API_BASE_URL}/api/download/${file.fileId}`,
                            "_blank",
                          )
                        }
                        title="Download"
                      >
                        <DownloadIcon className="h-5 w-5 text-gray-500 hover:text-gray-700" />
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm">No files shared yet</p>
          )}
          {showScrollDown && (
            <button
              onClick={() =>
                containerRef.current?.scrollTo({
                  top: containerRef.current.scrollHeight,
                  behavior: "smooth",
                })
              }
              className="mt-2 p-2 bg-blue-500 text-white rounded hover:bg-blue-700 cursor-pointer flex items-center justify-center"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ChatInfo;
