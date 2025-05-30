"use client"; // Ensure this runs only on the client side

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Pencil } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { CreateChannelModal } from "@/components/ui/create-channel-modal";
import { EditChannelModal } from "@/components/ui/edit-channel-modal";
import Notifications from "@/components/ui/notifications";
import { useSocketContext } from "@/context/SocketContext";

interface Channel {
  _id: string;
  name: string;
  active: boolean;
  users: Array<{
    _id: string;
    username: string;
    email: string;
  }>;
  isDirectMessage: boolean;
  createdBy: {
    _id: string;
    username: string;
  };
}

export default function Sidebar() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { user } = useAuth();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);
  const socket = useSocketContext();

  const API_BASE_URL =
    typeof window !== "undefined" && window.location.hostname === "localhost"
      ? "http://localhost:5001"
      : process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

  // Fetch channels from backend
  useEffect(() => {
    const fetchChannels = async () => {
      if (!user?.userID) return;

      try {
        const response = await fetch(
          `${API_BASE_URL}/api/channels?userId=${user.userID}`,
        );
        if (!response.ok) throw new Error("Failed to fetch channels");

        const data = await response.json();
        setChannels(data);
      } catch (err) {
        setError("Error fetching channels");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchChannels();
  }, [user]);

  // Fetch channels from backend
  const fetchChannels = async () => {
    if (!user?.userID) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/channels?userId=${user.userID}`,
      );
      if (!response.ok) throw new Error("Failed to fetch channels");

      const data = await response.json();
      setChannels(data);
    } catch (err) {
      setError("Error fetching channels");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChannels();

    const handleChannelUpdate = (updatedChannels: Channel[]) => {
      console.log("Received updated channels:", updatedChannels);
      setChannels(updatedChannels);
    };

    // Listen for `channelUpdated` event from WebSocket
    socket?.on("channelUpdated", handleChannelUpdate);

    return () => {
      socket?.off("channelUpdated", handleChannelUpdate);
    };
  }, [socket, user]);

  const createNewChannel = async (name: string, users: string[]) => {
    if (!user?.userID) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/channels`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          users: [...users, user.userID],
          createdBy: user.userID,
        }),
      });

      if (!response.ok) throw new Error("Failed to create channel");

      const { channel } = await response.json();
      setChannels((prev) => [...prev, channel]);
    } catch (err) {
      console.error(err);
      setError("Error creating channel");
    }
  };

  const handleChannelClick = (channelId: string) => {
    window.location.href = `/chat/${channelId}`;
  };

  const handleUpdateChannel = async (
    channelId: string,
    updates: { name: string; users: string[] },
  ) => {
    if (!user?.userID) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/channels/${channelId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updates),
        },
      );

      if (!response.ok) throw new Error("Failed to update channel");

      const { channel } = await response.json();
      setChannels((prev) =>
        prev.map((ch) => (ch._id === channelId ? channel : ch)),
      );
    } catch (err) {
      console.error(err);
      setError("Error updating channel");
    }
  };

  const handleArchiveChannel = async (channelId: string) => {
    if (!user?.userID) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/channels/${channelId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ active: false }), // Use active: false to archive
        },
      );

      if (!response.ok) throw new Error("Failed to archive channel");

      const { channel } = await response.json();
      setChannels((prev) =>
        prev.map((ch) => (ch._id === channelId ? channel : ch)),
      );
    } catch (err) {
      console.error(err);
      setError("Error archiving channel");
    }
  };

  const activeChannels = channels.filter((channel) => channel.active);
  return (
    <div className="h-full ring-2 ring-white text-white p-4 mx-4 my-4 flex flex-col rounded-lg">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold">Conversations</h2>
        <Button
          onClick={() => setIsCreateModalOpen(true)}
          variant="ghost"
          size="icon"
          className="text-white hover:bg-gray-700"
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>

      <CreateChannelModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={createNewChannel}
        currentUser={
          user ? { userID: user.userID, username: user.username } : null
        }
      />

      {/* Show loading state */}
      {loading && <p className="text-gray-400 mt-2">Loading channels...</p>}

      {/* Show error message if API request fails */}
      {error && <p className="text-red-500 mt-2">{error}</p>}

      <div className="h-1/2 overflow-y-auto mt-4 space-y-2">
        {activeChannels.length > 0
          ? activeChannels.map((channel) => (
              <Card
                key={channel._id}
                className="p-2 cursor-pointer bg-gray-700 hover:bg-gray-600"
              >
                <div className="flex justify-between items-start">
                  <div
                    className="flex-1"
                    onClick={() => handleChannelClick(channel._id)}
                  >
                    <span>{channel.name}</span>
                    <span className="text-xs text-gray-400 block">
                      {channel.users.length} members
                    </span>
                  </div>
                  {channel.createdBy?._id === user?.userID && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-gray-400 hover:text-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingChannel(channel);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </Card>
            ))
          : !loading && <p className="text-gray-400">No channels available</p>}
      </div>

      {editingChannel && (
        <EditChannelModal
          isOpen={!!editingChannel}
          onClose={() => setEditingChannel(null)}
          onSave={handleUpdateChannel}
          onArchive={handleArchiveChannel}
          channel={editingChannel}
          currentUser={
            user ? { userID: user.userID, username: user.username } : null
          }
        />
      )}

      <h2 className="text-lg font-bold mt-6">Notifications</h2>
      <Notifications />
    </div>
  );
}
