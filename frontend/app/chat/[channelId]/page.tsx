"use client";

import { useEffect, useState } from "react";
import Chat from "../page";
import { useParams } from "next/navigation";

export default function ChannelPage() {
  const [channelName, setChannelName] = useState("Loading...");
  const params = useParams();
  const channelId = params.channelId as string;

  useEffect(() => {
    const fetchChannelDetails = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/channels/${channelId}`,
        );
        if (!response.ok) throw new Error("Failed to fetch channel");
        const channel = await response.json();
        setChannelName(channel.name);
      } catch (error) {
        console.error("Error fetching channel details:", error);
        setChannelName("Unknown Channel");
      }
    };

    fetchChannelDetails();
  }, [channelId]);

  return <Chat roomName={channelName} channelId={channelId} />;
}
