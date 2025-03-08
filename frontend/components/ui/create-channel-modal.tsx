"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X } from "lucide-react";

interface User {
  _id: string;
  username: string;
  email: string;
}

interface CreateChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, users: string[]) => void;
  currentUser: { userID: string; username: string } | null;
}

export function CreateChannelModal({
  isOpen,
  onClose,
  onCreate,
  currentUser,
}: CreateChannelModalProps) {
  const [channelName, setChannelName] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);

  const API_BASE_URL =
  typeof window !== "undefined" && window.location.hostname === "localhost"
    ? "http://localhost:5001"
    : process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/users/search?q=${query}`,
      );
      if (!response.ok) throw new Error("Failed to search users");
      const users = await response.json();
      setSearchResults(
        users.filter((user: User) => user._id !== currentUser?.userID),
      );
    } catch (error) {
      console.error("Error searching users:", error);
    }
  };

  const handleAddUser = (user: User) => {
    if (!selectedUsers.find((u) => u._id === user._id)) {
      setSelectedUsers([...selectedUsers, user]);
    }
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleRemoveUser = (userId: string) => {
    setSelectedUsers(selectedUsers.filter((user) => user._id !== userId));
  };

  const handleCreate = () => {
    if (channelName.trim()) {
      onCreate(
        channelName,
        selectedUsers.map((user) => user._id),
      );
      setChannelName("");
      setSelectedUsers([]);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Channel</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Channel Name</Label>
            <Input
              id="name"
              value={channelName}
              onChange={(e) => setChannelName(e.target.value)}
              placeholder="Enter channel name"
            />
          </div>

          <div className="grid gap-2">
            <Label>Add Users</Label>
            <Input
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                searchUsers(e.target.value);
              }}
              placeholder="Search users..."
            />

            {searchResults.length > 0 && (
              <ScrollArea className="h-[100px] border rounded-md p-2">
                {searchResults.map((user) => (
                  <div
                    key={user._id}
                    className="flex items-center justify-between p-2 hover:bg-gray-100 cursor-pointer"
                    onClick={() => handleAddUser(user)}
                  >
                    <span>{user.username}</span>
                    <span className="text-sm text-gray-500">{user.email}</span>
                  </div>
                ))}
              </ScrollArea>
            )}

            <div className="mt-2">
              <Label>Selected Users</Label>
              <ScrollArea className="h-[100px] border rounded-md p-2">
                {selectedUsers.map((user) => (
                  <div
                    key={user._id}
                    className="flex items-center justify-between p-2"
                  >
                    <span>{user.username}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveUser(user._id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </ScrollArea>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleCreate}>Create Channel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
