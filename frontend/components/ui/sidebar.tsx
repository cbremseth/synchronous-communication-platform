"use client"; // Ensure this runs only on the client side

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "./button";
import { Input } from "./input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";

type Channel = {
  _id: string;
  name: string;
};

type SidebarProps = {
  onChannelSelect?: (channel: Channel) => void;
  selectedChannelId?: string;
};

export default function Sidebar({
  onChannelSelect,
  selectedChannelId,
}: SidebarProps) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isCreatingChannel, setIsCreatingChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");

  const fetchChannels = async () => {
    try {
      const response = await fetch("http://localhost:5001/api/channels");
      if (!response.ok) throw new Error("Failed to fetch channels");

      const data: Channel[] = await response.json();
      setChannels(data);
    } catch (err) {
      setError("Error fetching channels");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateChannel = async () => {
    if (!newChannelName.trim()) return;

    try {
      const response = await fetch("http://localhost:5001/api/channels", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: newChannelName }),
      });

      if (!response.ok) throw new Error("Failed to create channel");

      await response.json();
      setNewChannelName("");
      setIsCreatingChannel(false);
      fetchChannels();
    } catch (err) {
      setError("Error creating channel");
      console.error(err);
    }
  };
  // Fetch channels from backend
  useEffect(() => {
    fetchChannels();
  }, []);

  return (
    <div className="h-full ring-2 ring-white text-white p-4 mx-4 my-4 flex flex-col rounded-lg">
      <h2 className="text-lg font-bold">Conversations</h2>

      <Dialog open={isCreatingChannel} onOpenChange={setIsCreatingChannel}>
        <DialogTrigger asChild>
          <Button className="bg-violet-900 hover:bg-violet-800">
            Create Channel
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Channel</DialogTitle>
            <DialogDescription>
              Enter a name for your new channel.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={newChannelName}
              onChange={(e) => setNewChannelName(e.target.value)}
              placeholder="Channel name"
              className="text-black"
            />
          </div>
          <DialogFooter>
            <Button
              onClick={() => setIsCreatingChannel(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateChannel}
              className="bg-violet-900 hover:bg-violet-800"
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {loading && <p className="text-gray-400 mt-2">Loading channels...</p>}

      {/* Show error message if API request fails */}
      {error && <p className="text-red-500 mt-2">{error}</p>}

      <div className="h-1/2 overflow-y-auto mt-4 space-y-2">
        {channels.length > 0
          ? channels.map((channel) => (
              <Card
                key={channel._id}
                className={`p-2 cursor-pointer ${
                  selectedChannelId === channel._id
                    ? "bg-violet-700 hover:bg-violet-600"
                    : "bg-gray-700 hover:bg-gray-600"
                }`}
                onClick={() => onChannelSelect?.(channel)}
              >
                {channel.name}
              </Card>
            ))
          : !loading && <p className="text-gray-400">No channels available</p>}
      </div>

      <h2 className="text-lg font-bold mt-6">Notifications</h2>
      <ScrollArea className="h-1/2 opacity-50 bg-gray-700 px-2 py-4 hover:bg-violet-900 rounded-md flex-1 overflow-y-auto mt-2 h-32 overflow-auto">
        <p className="text-sm">
          User456 reacted to your message in Project Alpha
        </p>
        <p className="text-sm">User123 sent a message in Project Alpha</p>
      </ScrollArea>
    </div>
  );
}
