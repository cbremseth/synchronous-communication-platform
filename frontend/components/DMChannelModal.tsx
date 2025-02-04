"use client";

import React, { useState, useEffect, ChangeEvent } from "react";
import { useAuth } from "@/hooks/useAuth";

interface DMChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onChannelCreated: (channel: Channel) => void;
}

export interface Channel {
  _id: string;
  name: string;
  members?: string[];
  createdBy?: string;
}

interface User {
  _id: string;
  username: string;
  email: string;
}

const DMChannelModal: React.FC<DMChannelModalProps> = ({
  isOpen,
  onClose,
  onChannelCreated,
}) => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim() !== "") {
        fetch(
          `http://localhost:5001/api/users/search?q=${encodeURIComponent(
            searchQuery,
          )}`,
        )
          .then((res) => res.json())
          .then((data) => {
            // Exclude current user from results
            const filtered = data.filter((u: User) => u._id !== user.userID);
            setResults(filtered);
          })
          .catch((error) => {
            console.error("Error fetching users:", error);
          });
      } else {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, user]);

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setSelectedUser(null);
  };

  const handleCreateDM = async () => {
    if (!user || !selectedUser) return;
    setIsCreating(true);
    const channelName = `DM: ${user.username} & ${selectedUser.username}`;
    const payload = {
      name: channelName,
      members: [user.userID, selectedUser._id],
      createdBy: user.userID,
    };

    try {
      const response = await fetch("http://localhost:5001/api/channels", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (response.ok) {
        const createdChannel = await response.json();
        onChannelCreated(createdChannel.channel);
        onClose();
      } else {
        console.error("Failed to create DM channel");
      }
    } catch (error) {
      console.error("Error creating DM channel:", error);
    } finally {
      setIsCreating(false);
    }
  };

  if (!user || !isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
      <div className="bg-white p-6 rounded shadow-md max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">Create Direct Message</h2>
        <input
          type="text"
          placeholder="Search for a user..."
          value={searchQuery}
          onChange={handleSearchChange}
          className="w-full border rounded p-2 mb-4"
        />
        {results.length > 0 && (
          <ul className="max-h-48 overflow-y-auto mb-4">
            {results.map((u) => (
              <li
                key={u._id}
                className={`p-2 cursor-pointer ${
                  selectedUser?._id === u._id ? "bg-gray-200" : ""
                }`}
                onClick={() => setSelectedUser(u)}
              >
                {u.username} ({u.email})
              </li>
            ))}
          </ul>
        )}
        <div className="flex justify-end space-x-2">
          <button
            className="px-4 py-2 rounded bg-gray-300"
            onClick={onClose}
            disabled={isCreating}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 rounded bg-blue-500 text-white"
            onClick={handleCreateDM}
            disabled={!selectedUser || isCreating}
          >
            {isCreating ? "Creating..." : "Create DM"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DMChannelModal;
