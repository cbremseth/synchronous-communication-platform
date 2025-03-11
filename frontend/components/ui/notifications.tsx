"use client";

import { useEffect, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Manager } from "socket.io-client";

interface Notification {
  _id: string;
  type: "mention" | "message" | "channel_invite";
  channelId: string;
  messageId?: string;
  sender: {
    username: string;
  };
  content?: string;
  read: boolean;
  timestamp: string;
}

// Create a singleton socket instance
const manager = new Manager("http://localhost:5001", {
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});
const socket = manager.socket("/");

export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const router = useRouter();
  const { user } = useAuth();

  // Function to fetch notifications
  const fetchNotifications = async () => {
    if (!user?.userID) return;
    try {
      const response = await fetch(
        `http://localhost:5001/api/notifications?userId=${user.userID}`
      );
      if (!response.ok) throw new Error("Failed to fetch notifications");
      const data = await response.json();
      setNotifications(data);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  useEffect(() => {
    if (!user?.userID) return;

    // Ensure socket is connected
    if (!socket.connected) {
      socket.connect();
    }

    // Join user-specific room for notifications
    socket.emit("join_user", user.userID);

    // Fetch initial notifications
    fetchNotifications();

    // Listen for new notifications
    const handleNewNotification = (notification: Notification) => {
      console.log("Received new notification:", notification);
      setNotifications((prev) => [
        notification,
        ...prev.filter((n) => n._id !== notification._id),
      ]);
    };

    socket.on("notification", handleNewNotification);

    // Cleanup function
    return () => {
      socket.off("notification", handleNewNotification);
    };
  }, [user]);

  const handleNotificationClick = async (notification: Notification) => {
    try {
      // Mark notification as read
      await fetch("http://localhost:5001/api/notifications/read", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          notificationIds: [notification._id],
        }),
      });

      // Update local state immediately
      setNotifications((prev) =>
        prev.filter((n) => n._id !== notification._id)
      );

      // Navigate to the channel with message ID in hash
      if (notification.messageId) {
        // Use replace instead of push to ensure the URL updates properly
        router.replace(
          `/chat/${notification.channelId}?highlight=${notification.messageId}`
        );
      } else {
        router.replace(`/chat/${notification.channelId}`);
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
      // Revert the local state change if the API call failed
      fetchNotifications();
    }
  };

  const unreadNotifications = notifications.filter((n) => !n.read);

  return (
    <ScrollArea className="h-1/2 bg-gray-700 px-2 py-4 hover:bg-violet-900 rounded-md flex-1 overflow-y-auto mt-2">
      {unreadNotifications.length === 0 ? (
        <p className="text-sm text-gray-400">No new notifications</p>
      ) : (
        unreadNotifications.map((notification) => (
          <div
            key={notification._id}
            className="p-2 mb-2 rounded cursor-pointer bg-violet-800 hover:bg-violet-700 transition-colors duration-200"
            onClick={() => handleNotificationClick(notification)}
          >
            <p className="text-sm text-white">
              {notification.type === "mention" ? (
                <span>
                  <strong>
                    {notification.sender?.username || "Deleted User"}
                  </strong>{" "}
                  mentioned you in a message
                </span>
              ) : (
                <span>
                  New message from{" "}
                  <strong>
                    {notification.sender?.username || "Deleted User"}
                  </strong>
                </span>
              )}
            </p>
            {notification.content && (
              <p className="text-xs text-gray-300 mt-1">
                {notification.content}
              </p>
            )}
          </div>
        ))
      )}
    </ScrollArea>
  );
}
