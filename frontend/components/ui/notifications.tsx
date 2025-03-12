"use client";

import { useEffect, useState, useCallback } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useSocketContext } from "@/context/SocketContext";

interface Notification {
  _id: string;
  type: "mention" | "message" | "channel_invite";
  channelId: string;
  messageId?: string;
  // sender can either be an object with a username or a string
  sender: { username: string } | string;
  content?: string;
  read: boolean;
  timestamp: string;
}

const API_BASE_URL =
  typeof window !== "undefined" && window.location.hostname === "localhost"
    ? "http://localhost:5001"
    : process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const router = useRouter();
  const { user } = useAuth();
  const socket = useSocketContext();

  // Standard function to fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!user?.userID) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/notifications?userId=${user.userID}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch notifications");
      }

      const data = await response.json();
      setNotifications(data);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  }, [user?.userID]);

  // Handle socket connection and notification events
  useEffect(() => {
    // Only proceed if we have both user and socket
    if (!user?.userID || !socket) return;

    // Define a handler for new notifications
    const handleNewNotification = (notification: Notification) => {
      console.log("Received new notification:", notification);
      // Add the new notification to the top of the list, avoiding duplicates
      setNotifications((prev) => [
        notification,
        ...prev.filter((n) => n._id !== notification._id),
      ]);
    };

    // Define what happens when socket connects
    const handleConnect = () => {
      console.log("Notifications: Socket connected");
      // Join the user's personal room to receive their notifications
      socket.emit("join_user", user.userID);
      // Fetch existing notifications
      fetchNotifications();
    };

    // Set up socket event listeners
    socket.on("notification", handleNewNotification);
    socket.on("connect", handleConnect);

    // If socket is already connected, join room and fetch notifications immediately
    if (socket.connected) {
      handleConnect();
    }

    // Cleanup function to prevent memory leaks and duplicate listeners
    return () => {
      console.log("Notifications: Cleaning up socket listeners");
      // Remove all event listeners we added
      socket.off("notification", handleNewNotification);
      socket.off("connect", handleConnect);
      // Note: We don't disconnect the socket here as it's managed by the SocketContext
    };
  }, [user?.userID, socket, fetchNotifications]);

  // Handle clicking on a notification
  const handleNotificationClick = async (notification: Notification) => {
    try {
      // Mark the notification as read in the backend
      await fetch(`${API_BASE_URL}/api/notifications/read`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          notificationIds: [notification._id],
        }),
      });

      // Remove the notification from our local state
      setNotifications((prev) =>
        prev.filter((n) => n._id !== notification._id)
      );

      // Navigate to the relevant channel, highlighting the message if applicable
      if (notification.messageId) {
        router.replace(
          `/chat/${notification.channelId}?highlight=${notification.messageId}`
        );
      } else {
        router.replace(`/chat/${notification.channelId}`);
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
      // Refresh notifications if there was an error
      fetchNotifications();
    }
  };

  // Filter for unread notifications only
  const unreadNotifications = notifications.filter((n) => !n.read);

  return (
    <ScrollArea className="h-1/2 bg-gray-700 px-2 py-4 hover:bg-violet-900 rounded-md flex-1 overflow-y-auto mt-2">
      {unreadNotifications.length === 0 ? (
        <p className="text-sm text-gray-400">No new notifications</p>
      ) : (
        unreadNotifications.map((notification) => {
          // Handle different sender formats safely
          const senderName =
            typeof notification.sender === "object" &&
            notification.sender?.username
              ? notification.sender.username
              : typeof notification.sender === "string"
              ? notification.sender
              : "Deleted User";

          return (
            <div
              key={notification._id}
              className="p-2 mb-2 rounded cursor-pointer bg-violet-800 hover:bg-violet-700 transition-colors duration-200"
              onClick={() => handleNotificationClick(notification)}
            >
              <p className="text-sm text-white">
                {notification.type === "mention" ? (
                  <span>
                    <strong>{senderName}</strong> mentioned you in a message
                  </span>
                ) : (
                  <span>
                    New message from <strong>{senderName}</strong>
                  </span>
                )}
              </p>
              {notification.content && (
                <p className="text-xs text-gray-300 mt-1">
                  {notification.content}
                </p>
              )}
            </div>
          );
        })
      )}
    </ScrollArea>
  );
}
