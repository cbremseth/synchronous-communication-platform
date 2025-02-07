"use client"; // Ensure this runs only on the client side

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Bell } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { CreateChannelModal } from "@/components/ui/create-channel-modal";
import { EditChannelModal } from "@/components/ui/edit-channel-modal";
import { useToast } from "@/hooks/use-toast";
import { Manager } from "socket.io-client";

interface Channel {
  _id: string;
  name: string;
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

interface Notification {
  _id: string;
  type: "NEW_MESSAGE" | "CHANNEL_INVITE";
  channelId: string;
  channelName: string;
  content: string;
  timestamp: string;
}

const manager = new Manager("http://localhost:5001");
const socket = manager.socket("/");

export default function Sidebar() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { user } = useAuth();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { toast } = useToast();

  // Move fetchChannels outside of the first useEffect
  const fetchChannels = async () => {
    if (!user?.userID) return;
    
    try {
      const response = await fetch(`http://localhost:5001/api/channels?userId=${user.userID}`);
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
  const handleChannelClick = (channelId: string) => {
    window.location.href = `/chat/${channelId}`;
  };
  // First useEffect for initial channel fetch
  useEffect(() => {
    fetchChannels();
  }, [user]);

  // Notification effect
  useEffect(() => {
    if (!user?.userID) return;

    // Connect user to their personal notification channel
    socket.emit("user_connect", user.userID);

    // Listen for notifications
    socket.on("notification", (notification: Notification) => {
      toast({
        title: notification.type === "NEW_MESSAGE" ? "New Message" : "Channel Invite",
        description: notification.content,
        action: notification.channelId ? (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleChannelClick(notification.channelId.toString())}
          >
            View
          </Button>
        ) : undefined,
      });

      setNotifications(prev => [notification, ...prev]);

      if (notification.type === "CHANNEL_INVITE") {
        fetchChannels();
      }
    });

    // Fetch existing notifications
    const fetchNotifications = async () => {
      try {
        const response = await fetch(`http://localhost:5001/api/notifications?userId=${user.userID}`);
        if (!response.ok) throw new Error("Failed to fetch notifications");
        const data = await response.json();
        setNotifications(data);
      } catch (error) {
        console.error("Error fetching notifications:", error);
      }
    };

    fetchNotifications();

    return () => {
      socket.off("notification");
    };
  }, [user, toast, handleChannelClick]); // Add handleChannelClick to dependencies

  const createNewChannel = async (name: string, users: string[]) => {
    if (!user?.userID) return;

    try {
      const response = await fetch("http://localhost:5001/api/channels", {
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

  const handleUpdateChannel = async (channelId: string, updates: { name: string; users: string[] }) => {
    if (!user?.userID) return;

    try {
      const response = await fetch(`http://localhost:5001/api/channels/${channelId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) throw new Error("Failed to update channel");

      const { channel } = await response.json();
      setChannels(prev => prev.map(ch => ch._id === channelId ? channel : ch));
    } catch (err) {
      console.error(err);
      setError("Error updating channel");
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    // Get the channelId from the notification
    const channelId = notification.channelId?._id || notification.channelId;

    handleChannelClick(channelId);
    
    // Mark as read
    fetch("http://localhost:5001/api/notifications/read", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notificationIds: [notification._id] }),
    });
  };

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
        currentUser={user}
      />

      {/* Show loading state */}
      {loading && <p className="text-gray-400 mt-2">Loading channels...</p>}

      {/* Show error message if API request fails */}
      {error && <p className="text-red-500 mt-2">{error}</p>}

      <div className="h-1/2 overflow-y-auto mt-4 space-y-2">
        {channels.length > 0
          ? channels.map((channel) => (
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
          channel={editingChannel}
          currentUser={user}
        />
      )}

      <div className="flex justify-between items-center mt-6">
        <h2 className="text-lg font-bold">Notifications</h2>
        {notifications.length > 0 && (
          <div className="bg-red-500 rounded-full px-2 py-1 text-xs">
            {notifications.length}
          </div>
        )}
      </div>
      
      <ScrollArea className="flex-1 mt-2">
        {notifications.length > 0 ? (
          <div className="space-y-2">
            {notifications.map((notification) => (
              <div
                key={notification._id}
                className="bg-gray-700 p-2 rounded-lg cursor-pointer hover:bg-gray-600"
                onClick={() => handleNotificationClick(notification)}
              >
                <p className="text-sm">{notification.content}</p>
                <span className="text-xs text-gray-400">
                  {new Date(notification.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-sm">No new notifications</p>
        )}
      </ScrollArea>
    </div>
  );
}
