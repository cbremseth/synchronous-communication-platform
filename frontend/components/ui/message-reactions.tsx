import { useState, useRef, useEffect } from "react";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";
import { Button } from "@/components/ui/button";
import { Smile } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import Emoji from "@emoji-mart/react";
import { useSocketContext } from "@/context/SocketContext";

interface MessageReactionsProps {
  messageId: string;
  reactions: {
    [emoji: string]: {
      count: number;
      users: string[];
    };
  };
  API_BASE_URL: string;
  channelId: string;
}

export default function MessageReactions({
  messageId,
  reactions: initialReaction,
  API_BASE_URL,
  channelId,
}: MessageReactionsProps) {
  const { user } = useAuth();
  const [localReactions, setLocalReactions] = useState(initialReaction);
  const [showPicker, setShowPicker] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [reactionDetails, setReactionDetails] = useState<{
    [emoji: string]: { count: number; users: string[] };
  }>({});
  const [loadingDetails, setLoadingDetails] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const detailsRef = useRef<HTMLDivElement>(null);
  const socket = useSocketContext();

  // Toggle emoji picker
  const togglePicker = () => setShowPicker((prev) => !prev);

  // Fetch reaction details from the backend
  const fetchReactionDetails = async () => {
    if (loadingDetails) return;
    setLoadingDetails(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/reactionDetails/${messageId}`,
        { method: "POST" },
      );

      if (!response.ok) {
        throw new Error("Failed to fetch reaction details");
      }

      const data = await response.json();
      setReactionDetails(data.reactionDetails);
    } catch (error) {
      console.error("Error fetching reaction details:", error);
    } finally {
      setLoadingDetails(false);
    }
  };

  // SEEDING CUSTOM EMOJI - static image for cusom emoji
  const custom = [
    {
      id: "github",
      name: "GitHub",
      emojis: [
        {
          id: "octocat",
          name: "Octocat",
          keywords: ["github"],
          skins: [{ src: "/images/octocat.png" }],
        },
      ],
    },
  ];

  const handleAddCustomEmoji = (newEmoji: typeof Emoji) => {
    console.log("Add custom emoji <a> clicked", newEmoji);
    // const updatedCustomEmojis = [...customEmojis, newEmoji];
    // setCustomEmojis(updatedCustomEmojis);
  };

  // Close picker when pressing Escape key
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowPicker(false);
      }
    };

    document.addEventListener("keydown", handleEscapeKey);

    // Handle Click outside
    const handleClickOutside = (event: MouseEvent) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(event.target as Node)
      ) {
        setShowPicker(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [channelId]);

  // Real-time reaction updates
  useEffect(() => {
    socket?.on("add_reaction", ({ messageId: updatedMsgId, reactions }) => {
      if (updatedMsgId !== messageId) return;

      console.log("Real-time reaction update received:", reactions);

      setLocalReactions(reactions);
    });

    return () => {
      socket?.off("add_reaction");
    };
  }, [socket, messageId]);

  // Handle emoji selection
  const handleEmojiSelect = async (emoji: {
    native?: string;
    src?: string;
  }) => {
    if (!user || !channelId) return;

    const selectedEmoji = emoji.native || emoji.src || "";
    if (!selectedEmoji) {
      console.error("Invalid emoji selected:", emoji);
      return;
    }

    const emojiKey = String(selectedEmoji);

    // Update UI for current state
    setLocalReactions((prevReactions) => {
      const updatedReactions = { ...prevReactions };
      const reaction = updatedReactions[emojiKey]
        ? { ...updatedReactions[emojiKey] }
        : { count: 0, users: [] };

      const hasReacted = reaction.users.includes(user.userID);

      if (hasReacted) {
        reaction.count -= 1;
        reaction.users = reaction.users.filter((id) => id !== user.userID);
        if (reaction.count === 0) delete updatedReactions[emojiKey];
      } else {
        reaction.count += 1;
        reaction.users.push(user.userID);
        updatedReactions[emojiKey] = reaction;
      }

      return updatedReactions;
    });

    // ✅ Emit reaction event to the backend (Ensure emoji is a string)
    socket?.emit("add_reaction", {
      messageId,
      emoji: emojiKey, // 🔥 Always send emoji as a string
      userId: user.userID,
      channelId,
    });

    setShowPicker(false);
  };

  return (
    <div className="relative flex items-center space-x-2">
      {/* Display selected emojis with counts */}
      <div className="flex space-x-1">
        {Object.entries(localReactions || {}).map(([emoji, data]) => (
          <button
            key={emoji}
            className={`flex items-center space-x-1 p-1 rounded-md hover:bg-gray-300 ${
              data.users.includes(user?.userID) ? "bg-blue-200" : "bg-gray-200"
            }`}
            onClick={() => {
              setShowDetails(true);
              fetchReactionDetails();
            }}
          >
            {emoji.startsWith("http") || emoji.startsWith("/images/") ? (
              <img src={emoji} alt="custom emoji" className="w-6 h-6" />
            ) : (
              <span>{emoji}</span>
            )}

            <span className="text-sm">{data.count}</span>
          </button>
        ))}
      </div>

      {/* Emoji Picker Button */}
      <Button variant="ghost" onClick={togglePicker} className="p-2 rounded-md">
        <Smile className="w-6 h-6 text-gray-600" />
      </Button>

      {/* Centered Picker with Reduced Size */}
      {showPicker && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
          onClick={() => setShowPicker(false)} // Close picker when clicking outside
        >
          <div
            ref={pickerRef}
            className="bg-gray-900 p-4 rounded-lg shadow-lg"
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
          >
            <Picker
              data={data}
              onEmojiSelect={handleEmojiSelect}
              theme="dark"
              perLine={6}
              emojiSize={22}
              onAddCustomEmoji={handleAddCustomEmoji}
              custom={custom}
              autoFocus="true"
            />
          </div>
        </div>
      )}

      {/* Reaction Details Modal */}
      {showDetails && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
          onClick={() => setShowDetails(false)}
        >
          <div
            ref={detailsRef}
            className="bg-white p-4 rounded-lg shadow-lg max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-semibold mb-2 text-center">
              Reactions
            </h3>

            {loadingDetails ? (
              <p className="text-center text-gray-500">Loading...</p>
            ) : (
              Object.entries(reactionDetails).map(([emoji, data]) => (
                <div key={emoji} className="py-1">
                  <div className="flex justify-between items-center">
                    <span>{emoji}</span>
                    <span className="text-xs text-gray-600">
                      {data.count} reacted
                    </span>
                  </div>
                  <ul className="text-xs text-gray-500">
                    {data.users.map((username, index) => (
                      <li key={index}>{username}</li>
                    ))}
                  </ul>
                </div>
              ))
            )}

            <div className="flex justify-end mt-4">
              <Button variant="ghost" onClick={() => setShowDetails(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
