import { io } from "socket.io-client";

const SOCKET_URL =
  typeof window !== "undefined" && window.location.hostname === "localhost"
    ? "http://localhost:5001"
    : process.env.NEXT_PUBLIC_API_URL || "http://backend:5001";

export const socket_path = io(SOCKET_URL, {
  withCredentials: true,
  autoConnect: false,
});
