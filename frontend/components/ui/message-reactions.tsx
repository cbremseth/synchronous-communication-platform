import { useState, useRef, useEffect } from "react";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";
import { Button } from "@/components/ui/button";
import { Smile } from "lucide-react"; // Import Smile icon from lucide-react

export default function EmojiPicker({ messageId, reactions, emojiSetter }) {
  const [showPicker, setShowPicker] = useState(false);
  const [selectedEmoji, setSelectedEmoji] = useState("");
  const pickerRef = useRef(null); // Reference to the emoji picker div
  const pickerWrapperRef = useRef(null); // Wrapper to apply position adjustments

  // Toggle the emoji picker visibility
  const togglePicker = () => setShowPicker(!showPicker);

  // Handle emoji selection
  const handleEmojiSelect = (emoji) => {
    setSelectedEmoji(emoji.native); // Store selected emoji
    setShowPicker(false); // Close the picker when an emoji is selected

    // Send the selected emoji to the backend using PATCH request
    sendEmojiToBackend(emoji.native);
  };

  // Send emoji to the backend
  const sendEmojiToBackend = async (emoji) => {
    try {
      const response = await fetch(`/api/messages/${messageId}/reactions`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          emoji: emoji,
          userId: emojiSetter,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send emoji reaction to the backend");
      }

      const data = await response.json();
      console.log("Emoji successfully sent:", data);
    } catch (error) {
      console.error("Error sending emoji to backend:", error);
    }
  };

  // Function to adjust the position of the emoji picker
  const adjustPickerPosition = () => {
    if (pickerRef.current) {
      const pickerRect = pickerRef.current.getBoundingClientRect();
      const pickerBottom = pickerRect.bottom;
      const windowHeight = window.innerHeight;

      // If the emoji picker is too close to the bottom of the page, move it up
      if (pickerBottom > windowHeight - 10) {
        pickerWrapperRef.current.style.bottom = `${pickerRect.height}px`;
      } else {
        pickerWrapperRef.current.style.bottom = "0";
      }
    }
  };

  // Close the emoji picker when clicking outside the picker
  const handleClickOutside = (event) => {
    if (pickerWrapperRef.current && !pickerWrapperRef.current.contains(event.target)) {
      setShowPicker(false); // Close picker if clicked outside
    }
  };

  // Close the emoji picker when pressing the Escape key
  const handleEscapeKey = (event) => {
    if (event.key === "Escape") {
      setShowPicker(false); // Close picker if Escape key is pressed
    }
  };

  // Add the event listener for clicks outside the picker and Escape key
  useEffect(() => {
    // Listen for click events on the document
    document.addEventListener("mousedown", handleClickOutside);

    // Listen for the Escape key to close the picker
    document.addEventListener("keydown", handleEscapeKey);

    // Cleanup the event listeners
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, []);

  // Adjust picker position when it appears
  useEffect(() => {
    if (showPicker) {
      adjustPickerPosition();
    }
  }, [showPicker]);

  return (
    <div>
      {/* Button to trigger the emoji picker */}
      <Button
        variant="ghost"
        onClick={togglePicker}
        className="p-2 rounded-md flex items-center justify-center"
      >
        {selectedEmoji ? (
          selectedEmoji
        ) : (
          <Smile className="w-6 h-6 text-gray-600" />
        )}
      </Button>

      {/* Emoji picker when showPicker is true */}
      {showPicker && (
        <div
          ref={pickerWrapperRef}
          className="absolute z-10"
          style={{ bottom: 0 }}
        >
          <Picker data={data} onEmojiSelect={handleEmojiSelect} theme="dark" ref={pickerRef} />
        </div>
      )}
    </div>
  );
}
