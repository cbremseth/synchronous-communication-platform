"use client"; // Ensure this runs only on the client side

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function Sidebar() {
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch channels from backend
  useEffect(() => {
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

    fetchChannels();
  }, []);

  return (
    <div className="h-full ring-2 ring-white text-white p-4 mx-4 my-4 flex flex-col rounded-lg">
      <h2 className="text-lg font-bold">Conversations</h2>

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
