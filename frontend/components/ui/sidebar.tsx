"use client"; // Ensure this runs only on the client side

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export default function Sidebar() {
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [channelToArchive, setChannelToArchive] = useState(null);

  // Fetch channels from backend
  const fetchChannels = async () => {
    try {
      const response = await fetch("http://localhost:5001/api/channels");
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
  }, []);

  // Handle new channel submission
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

      const data = await response.json();
      console.log("API response:", data); // Debugging

      const newChannel = data.channel; // ✅ Extract channel object

      if (!newChannel || !newChannel.name) {
        throw new Error("Invalid channel data received");
      }

      setChannels((prevChannels) => [...prevChannels, newChannel]);
      setNewChannelName("");
      setIsModalOpen(false);
    } catch (err) {
      console.error("Error creating channel:", err);
    }
  };

  // Handle archiving a channel
  const handleArchiveChannel = async () => {
    if (!channelToArchive) return;

    try {
      const response = await fetch(`http://localhost:5001/api/channels/${channelToArchive._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ active: false }),
      });

      if (!response.ok) throw new Error("Failed to archive channel");

      const data = await response.json();
      console.log("Archived channel response:", data);

      // Remove the channel from UI
      setChannels((prevChannels) => prevChannels.filter(channel => channel._id !== channelToArchive._id));

      setArchiveModalOpen(false);
      setChannelToArchive(null);
    } catch (err) {
      console.error("Error archiving channel:", err);
    }
  };

  return (
    <div className="h-full ring-2 ring-white text-white mx-4 flex flex-col rounded-lg text-center p-4">
      <h2 className="text-lg font-bold my-4">Channels</h2>

      {/* Show loading state */}
      {loading && <p className="text-gray-400 mt-2">Loading channels...</p>}

      {/* Show error message if API request fails */}
      {error && <p className="text-red-500 mt-2">{error}</p>}

      <div className="h-1/2 overflow-y-auto mt-4 space-y-2">
        {channels.length > 0
          ? channels.map((channel) => (
            <Card key={channel._id} className="p-2 cursor-pointer bg-gray-700 hover:bg-gray-600 flex justify-between items-center">
              <span>{channel.name}</span>
              <Button
                variant="outline"
                className="text-red-500 border-red-500 hover:bg-red-500 hover:text-white"
                onClick={() => {
                  setChannelToArchive(channel);
                  setArchiveModalOpen(true);
                }}
              >
                Archive
              </Button>
            </Card>
          ))
          : !loading && <p className="text-gray-400">No channels available</p>}
      </div>

      {/* New Channel Button */}
      <Button className="mt-4 bg-violet-600 hover:bg-violet-700" onClick={() => setIsModalOpen(true)}>
        New Channel
      </Button>

      {/* New Channel Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-gray-800 text-white p-6 rounded-lg">
          <DialogHeader>
            <DialogTitle>Create a New Channel</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Enter channel name"
            value={newChannelName}
            onChange={(e) => setNewChannelName(e.target.value)}
            className="text-black p-2 rounded-md w-full"
          />
          <div className="flex justify-end space-x-2 mt-4">
            <DialogClose asChild>
              <Button variant="outline" className="bg-gray-700 hover:bg-gray-600">
                Cancel
              </Button>
            </DialogClose>
            <Button onClick={handleCreateChannel} className="bg-violet-600 hover:bg-violet-700">
              Create
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Archive Channel Confirmation Modal */}
      <Dialog open={archiveModalOpen} onOpenChange={setArchiveModalOpen}>
        <DialogContent className="bg-gray-800 text-white p-6 rounded-lg">
          <DialogHeader>
            <DialogTitle>Archive Channel</DialogTitle>
          </DialogHeader>
          <p>Are you sure you want to archive <strong>{channelToArchive?.name}</strong>? This action is permanent.</p>
          <div className="flex justify-end space-x-2 mt-4">
            <DialogClose asChild>
              <Button variant="outline" className="bg-gray-700 hover:bg-gray-600">
                Cancel
              </Button>
            </DialogClose>
            <Button onClick={handleArchiveChannel} className="bg-red-600 hover:bg-red-700">
              Archive
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <h2 className="text-lg font-bold mt-6">Notifications</h2>
      <ScrollArea className="h-1/2 opacity-50 bg-gray-700 px-2 py-4 hover:bg-violet-900 rounded-md flex-1 overflow-y-auto mt-2 h-32 overflow-auto">
        <p className="text-sm">User456 reacted to your message in Project Alpha</p>
        <p className="text-sm">User123 sent a message in Project Alpha</p>
      </ScrollArea>
    </div>
  );
}
