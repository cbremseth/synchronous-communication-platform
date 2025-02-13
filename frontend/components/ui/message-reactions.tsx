import { useState, useRef, useEffect } from "react";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";
import { Button } from "@/components/ui/button";
import { Smile, MoreHorizontal } from "lucide-react";
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
  // get username for emoji reaction
  getUsernames: (userId: string[]) => Promise<{[key:string]: string }>;
}

export default function MessageReactions({
  messageId,
  reactions,
  onReact,
  getUsernames
}: MessageReactionsProps) {
  const { user } = useAuth();
  const [localReactions, setLocalReactions] = useState(reactions);
  const [showPicker, setShowPicker] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [usernames, setUsernames] = useState<{ [key: string]: string }>({});
  const pickerRef = useRef<HTMLDivElement>(null);
  const detailsRef = useRef<HTMLDivElement>(null);

  // Sync reactions with props
  useEffect(() => {
    setLocalReactions(reactions);
  }, [reactions]);

  // Fetch usernames when details are opened
  useEffect(() => {
    if (showDetails) {
      const allUserIds = Object.values(localReactions)
        .flatMap((reaction) => reaction.users)
        .filter((userId, index, self) => self.indexOf(userId) === index);

      getUsernames(allUserIds).then(setUsernames);
    }
  }, [showDetails, localReactions]);

  // Toggle emoji picker
  const togglePicker = () => setShowPicker((prev) => !prev);

  // Toggle details
  const toggleDetails = () => {
    setShowDetails((prev) => !prev);
  }
  // Handle emoji selection
  const handleEmojiSelect = (emoji: typeof Emoji) => {
    if (!user) return;
    const selectedEmoji = emoji.native;

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
        if (detailsRef.current && !detailsRef.current.contains(event.target as Node)) {
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
            onClick={() => handleEmojiSelect({ native: emoji })}
          >
            <span>{emoji}</span>
            <span className="text-sm">{data.count}</span>
          </button>
        ))}
      </div>

      {/* Reaction Details Button */}
      <Button variant="ghost" onClick={toggleDetails} className="p-2 rounded-md">
        <MoreHorizontal className="w-6 h-6 text-gray-600" />
      </Button>

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
      {/* Reaction Details Popup */}
      {showDetails && (
        <div
          ref={detailsRef}
          className="absolute bottom-10 right-0 bg-white p-3 rounded-md shadow-md z-10 w-48"
        >
          <h3 className="text-sm font-semibold mb-2">Reactions</h3>
          {Object.entries(localReactions).map(([emoji, data]) => (
            <div key={emoji} className="py-1">
              <div className="flex justify-between items-center">
                <span>{emoji}</span>
                <span className="text-xs text-gray-600">{data.count} reacted</span>
              </div>
              <ul className="text-xs text-gray-500">
                {data.users.map((userId) => (
                  <li key={userId}>{usernames[userId] || "Loading..."}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
