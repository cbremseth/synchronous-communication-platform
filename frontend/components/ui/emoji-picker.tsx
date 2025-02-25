import { useEffect, useRef, useState } from "react";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";

interface EmojiPickerProps {
  API_BASE_URL: string;
  onSelectEmoji: (emoji: { native?: string; src?: string }) => void;
  onClose: () => void;
}

export default function EmojiPickerModal({
  API_BASE_URL,
  onSelectEmoji,
  onClose,
}: EmojiPickerProps) {
  const [customDynamicEmojis, setCustomDynamicEmojis] = useState<
    { id: string; name: string; src: string }[]
  >([]);
  const pickerRef = useRef<HTMLDivElement>(null);

  const fetchCustomEmojis = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/custom-emojis`);
      if (!response.ok) throw new Error("Failed to fetch custom emojis");
      const data = await response.json();
      setCustomDynamicEmojis(data.emojis);
    } catch (error) {
      console.error("Error loading custom emojis:", error);
    }
  };

  useEffect(() => {
    fetchCustomEmojis();
  }, []);

  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscapeKey);

    const handleClickOutside = (event: MouseEvent) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [onClose]);

  const customEmojiPicker = [
    {
      id: "custom",
      name: "Uploaded Files",
      emojis: customDynamicEmojis.map((emoji) => ({
        id: emoji.id,
        name: emoji.name,
        keywords: ["uploaded", "custom"],
        skins: [{ src: emoji.src }],
      })),
    },
    {
      id: "static",
      name: "Static File",
      emojis: [
        {
          id: "octocat",
          name: "Octocat",
          skins: [{ src: "/images/octocat.png" }],
        },
      ],
    },
  ];

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
      onClick={onClose}
    >
      <div
        ref={pickerRef}
        className="bg-gray-900 p-4 rounded-lg shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <Picker
          data={data}
          onEmojiSelect={onSelectEmoji}
          theme="dark"
          perLine={6}
          emojiSize={22}
          custom={customEmojiPicker}
          autoFocus="true"
        />
      </div>
    </div>
  );
}
