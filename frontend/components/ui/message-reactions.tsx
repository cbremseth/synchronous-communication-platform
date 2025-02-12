"use client";
import { useState } from "react";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";
import { Smile } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { socket_path } from "@/lib/socket";

interface ReactionProps {
  messageId: string;
  reactions: { [emoji: string]: string[] };
}

export default function MessageReactions({ messageId, reactions = {} }: ReactionProps) {
  const [showPicker, setShowPicker] = useState(false);
  const { user } = useAuth();

  const togglePicker = () => setShowPicker(!showPicker);

  const handleReaction = async (emoji: any) => {
    if (!user) return;

    const emojiUnicode = emoji.native;
    socket_path.emit("add_reaction", { messageId, emoji: emojiUnicode, userId: user._id });

    try {
      await fetch(`/api/messages/${messageId}/reactions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji: emojiUnicode, userId: user._id }),
      });
    } catch (error) {
      console.error("Error updating reaction:", error);
    }
  };

  return (
    <div className="relative">
      <Button variant="ghost" size="icon" onClick={togglePicker}>
        <Smile className="w-5 h-5 text-gray-500 hover:text-gray-700" />
      </Button>

      {showPicker && (
        <div className="absolute bottom-full left-0 z-10 bg-white shadow-md rounded-md">
          <Picker data={data} onEmojiSelect={handleReaction} theme="dark" />
        </div>
      )}

    <div className="flex gap-2 mt-2">
    {reactions && Object.entries(reactions).map(([emoji, users]) => (
        <span key={emoji} className="flex items-center gap-1 bg-gray-200 px-2 py-1 rounded-md text-sm">
        {emoji} {users.length}
        </span>
    ))}
    </div>

    </div>
  );
}
