import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { useSocketContext } from "@/context/SocketContext";
import { useAuth } from "@/hooks/useAuth";
import { updateUserStatusAction } from "@/app/actions/auth";

interface Participant {
  id: string;
  username: string;
  status: "online" | "busy" | "offline";
}

export default function ChatInfo({ channelId }: { channelId: string }) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [updating, setUpdating] = useState(false);
  const socket = useSocketContext();
  const { user: currentUser } = useAuth();

  const handleStatusChange = async (
    userId: string,
    newStatus: "online" | "busy" | "offline",
  ) => {
    if (currentUser?.id !== userId || updating) return;
    setUpdating(true);
    try {
      const result = await updateUserStatusAction({
        session: { user: { id: currentUser.id } },
        newStatus,
      });
      if (result.success) {
        socket?.emit("update_status", { userId, status: newStatus });
      }
    } catch (error) {
      console.error("Status update failed:", error);
    } finally {
      setUpdating(false);
    }
  };

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

    return () => {
      socket.off("channel_participants");
      socket.off("statusUpdated");
    };
  }, [socket, channelId]);

  return (
    <div className="w-full h-full bg-gray-200 p-4">
      <Card className="p-3">
        <h3 className="font-semibold mb-2">Participants</h3>
        <ul className="space-y-2">
          {participants.map((participant) => (
            <li key={participant.id} className="flex items-center gap-2">
              {currentUser?.id === participant.id ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <span
                      className={`w-2 h-2 rounded-full ${
                        participant.status === "online"
                          ? "bg-green-500"
                          : participant.status === "busy"
                            ? "bg-red-500"
                            : "bg-gray-500"
                      }`}
                    />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem
                      disabled={updating}
                      onClick={() =>
                        handleStatusChange(participant.id, "online")
                      }
                    >
                      Online
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={updating}
                      onClick={() => handleStatusChange(participant.id, "busy")}
                    >
                      Busy
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={updating}
                      onClick={() =>
                        handleStatusChange(participant.id, "offline")
                      }
                    >
                      Offline
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <span
                  className={`w-2 h-2 rounded-full ${
                    participant.status === "online"
                      ? "bg-green-500"
                      : participant.status === "busy"
                        ? "bg-red-500"
                        : "bg-gray-500"
                  }`}
                />
              )}
              <span>{participant.username}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
