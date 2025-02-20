import React, { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import mongoose from "mongoose";
import { EyeIcon, DownloadIcon, ChevronDown } from "lucide-react";

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
}

const ChatInfo: React.FC<ChatInfoProps> = ({ files, API_BASE_URL }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showScrollDown, setShowScrollDown] = useState(false);

  const handleScroll = () => {
    if (containerRef.current) {
      const isScrolledToBottom =
        containerRef.current.scrollHeight - containerRef.current.scrollTop ===
        containerRef.current.clientHeight;
      setIsAtBottom(isScrolledToBottom);
      setShowScrollDown(!isScrolledToBottom);
    }
  };

  useEffect(() => {
    if (containerRef.current && isAtBottom) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [files]); // Only rerun the effect if files array changes

  return (
    <div className="w-full h-full bg-gray-200 p-4 flex flex-col justify-between">
      <h2 className="text-lg font-semibold mb-4">Room Details</h2>
      <div className="flex flex-col flex-1 justify-between">
        <Card className="p-3 h-1/2 overflow-hidden">
          <h3 className="font-semibold">Participants</h3>
          <hr className="mb-4 border-t border-gray-300" />
          <ul className="text-sm">
            <li>User123</li>
            <li>User456</li>
            <li>You</li>
          </ul>
        </Card>
        <Card className="p-3 h-1/2 mt-8 overflow-auto">
          <h3 className="font-semibold">Files</h3>
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
