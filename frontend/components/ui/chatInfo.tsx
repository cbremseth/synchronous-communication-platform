import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { useSocketContext } from "@/context/SocketContext";

interface Participant {
  id: string;
  username: string;
  status: "online" | "busy" | "offline";
}

export default function ChatInfo({ channelId }: { channelId: string }) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const socket = useSocketContext();

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
              <span
                className={`w-2 h-2 rounded-full ${
                  participant.status === "online"
                    ? "bg-green-500"
                    : participant.status === "busy"
                      ? "bg-red-500"
                      : "bg-gray-500"
                }`}
              />
              <span>{participant.username}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
