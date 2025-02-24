"use client";
import React from "react";
import Emoji from "@emoji-mart/react";

interface CustomEmojiPickerProps {
  customEmojis: string[];
  onSelect: (emoji: typeof Emoji) => void;
}

const CustomEmojiPicker: React.FC<CustomEmojiPickerProps> = ({
  customEmojis,
  onSelect,
}) => {
  return (
    <div className="flex flex-wrap gap-2 p-2">
      {customEmojis.length > 0 ? (
        customEmojis.map((emojiUrl, index) => (
          <button
            key={index}
            onClick={() => onSelect({ native: emojiUrl })}
            className="w-10 h-10 flex items-center justify-center rounded-md border bg-white shadow-md"
          >
            <img src={emojiUrl} alt="custom emoji" className="w-8 h-8" />
          </button>
        ))
      ) : (
        <p className="text-sm text-gray-500">No custom emojis added.</p>
      )}
    </div>
  );
};

export default CustomEmojiPicker;
