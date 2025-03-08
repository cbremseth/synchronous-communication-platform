"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
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

  useEffect(() => {
    const manager = new Manager(`${API_BASE_URL}`);
    const socketInstance = manager.socket("/");
    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
  );
};
