import { useState, useRef, useEffect } from "react";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";
import { Button } from "@/components/ui/button";
import { Smile } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import Emoji from "@emoji-mart/react";

interface MessageReactionsProps {
  messageId: string;
  reactions: {
    [emoji: string]: {
      count: number;
      users: string[];
    };
  };
  onReact: (messageId: string, emoji: string, userId: string) => void;
  getReactionDetails: (messageId: string) => Promise<{
    [emoji: string]: { count: number; users: string[] };
  }>;
  API_BASE_URL: string;
}

export default function MessageReactions({
  messageId,
  reactions,
  onReact,
  getReactionDetails,
  API_BASE_URL,
}: MessageReactionsProps) {
  const { user } = useAuth();
  const [localReactions, setLocalReactions] = useState(reactions);
  const [showPicker, setShowPicker] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [reactionDetails, setReactionDetails] = useState<{
    [emoji: string]: { count: number; users: string[] };
  }>({});
  const [loadingDetails, setLoadingDetails] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const detailsRef = useRef<HTMLDivElement>(null);

  // Sync reactions with props
  useEffect(() => {
    setLocalReactions(reactions);
  }, [reactions]);

  // Fetch reaction details when details panel is opened
  useEffect(() => {
    if (showDetails && !loadingDetails) {
      setLoadingDetails(true);
      getReactionDetails(messageId)
        .then((details) => setReactionDetails(details))
        .catch(() => setReactionDetails({}))
        .finally(() => setLoadingDetails(false));
    }
  }, [showDetails]);

  // Toggle emoji picker
  const togglePicker = () => setShowPicker((prev) => !prev);

  // Toggle details
  const toggleDetails = () => setShowDetails((prev) => !prev);

  // Handle emoji selection
  const handleEmojiSelect = async (emoji: typeof Emoji) => {
    if (!user) return;
    let selectedEmoji = emoji.native;

    try {
      const res = await fetch(`${API_BASE_URL}/api/custom-emojis/${emoji.id}`);

      if (res.ok) {
        const customEmojis = await res.json();
        selectedEmoji = customEmojis.id;
      }
    } catch (error) {
      console.error("Error fetching custom emoji:", error);
    }

    // Update reactions optimistically
    setLocalReactions((prevReactions) => {
      const existingReaction = prevReactions[selectedEmoji] || {
        count: 0,
        users: [],
      };
      const hasReacted = existingReaction.users.includes(user.userID);

      return {
        ...prevReactions,
        [selectedEmoji]: {
          count: hasReacted
            ? existingReaction.count - 1
            : existingReaction.count + 1,
          users: hasReacted
            ? existingReaction.users.filter((id) => id !== user.userID)
            : [...existingReaction.users, user.userID],
        },
      };
    });

    // Send reaction to backend
    onReact(messageId, selectedEmoji, user.userID);
    setShowPicker(false);
  };

  // Close picker when pressing Escape key
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowPicker(false);
      }
    };

    document.addEventListener("keydown", handleEscapeKey);
    return () => document.removeEventListener("keydown", handleEscapeKey);
  }, []);

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(event.target as Node)
      ) {
        setShowPicker(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close details popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        detailsRef.current &&
        !detailsRef.current.contains(event.target as Node)
      ) {
        setShowDetails(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative flex items-center space-x-2">
      {/* Display selected emojis with counts */}
      <div className="flex space-x-1">
        {Object.entries(localReactions).map(([emoji, data]) => (
          <button
            key={emoji}
            className={`flex items-center space-x-1 p-1 rounded-md hover:bg-gray-300 ${
              data.users.includes(user?.userID) ? "bg-blue-200" : "bg-gray-200"
            }`}
            onClick={toggleDetails}
          >
            <span>{emoji}</span>
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
              perLine={6} // Reduce width
              emojiSize={22} // Smaller emoji size
            />
          </div>
        </div>
      )}
      {/* Centered Reactions Popup */}
      {showDetails && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
          onClick={() => setShowDetails(false)} // Close when clicking outside
        >
          <div
            ref={detailsRef}
            className="bg-white p-4 rounded-lg shadow-lg max-w-sm w-full"
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
          >
            <h3 className="z-51 text-sm font-semibold mb-2 text-center">
              Reactions
            </h3>
            {Object.entries(reactionDetails).map(([emoji, data]) => (
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
            ))}
            <div className="flex justify-end mt-4">
              <Button
                className="z90"
                variant="ghost"
                onClick={() => setShowDetails(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
