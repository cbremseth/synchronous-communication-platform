"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
} from "react";
import { Manager, Socket } from "socket.io-client";

const SocketContext = createContext<Socket | null>(null);

export const useSocketContext = () => useContext(SocketContext);

const API_BASE_URL =
  typeof window !== "undefined" && window.location.hostname === "localhost"
    ? "http://localhost:5001"
    : process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Ensure that the socket is only initialized once
    if (!socketRef.current) {
      try {
        const manager = new Manager(`${API_BASE_URL}`, {
          autoConnect: true, // Ensure the socket connects automatically
          reconnectionAttempts: 5, // Limit reconnection attempts
        });

        const socketInstance = manager.socket("/");

        socketInstance.on("connect_error", (err) => {
          console.error("Socket connection error:", err);
        });

        socketInstance.on("connect_timeout", (timeout) => {
          console.error("Socket connection timeout:", timeout);
        });

        socketRef.current = socketInstance;
        setSocket(socketInstance);

        socketInstance.on("disconnect", (reason) => {
          console.log(`Socket disconnected: ${reason}`);
        });
      } catch (error) {
        console.error("Failed to initialize socket:", error);
      }
    }

    // Cleanup function to disconnect the socket when the component unmounts
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
      }
    };
  }, []);

  return (
    <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
  );
};
