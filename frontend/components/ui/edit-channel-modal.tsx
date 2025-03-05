"use client";

import { useState, useEffect } from "react";
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

interface Channel {
  _id: string;
  name: string;
  users: User[];
  createdBy: {
    _id: string;
    username: string;
  };
}

interface EditChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    channelId: string,
    updates: { name: string; users: string[] },
  ) => void;
  onArchive: (channelId: string) => void;
  channel: Channel;
  currentUser: { userID: string; username: string } | null;
}

export function EditChannelModal({
  isOpen,
  onClose,
  onSave,
  onArchive,
  channel,
  currentUser,
}: EditChannelModalProps) {
  const [channelName, setChannelName] = useState(channel.name);
  const [selectedUsers, setSelectedUsers] = useState<User[]>(channel.users);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);

  useEffect(() => {
    setChannelName(channel.name);
    setSelectedUsers(channel.users);
  }, [channel]);

  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/users/search?q=${query}`,
      );
      if (!response.ok) throw new Error("Failed to search users");
      const users = await response.json();
      setSearchResults(
        users.filter(
          (user: User) =>
            user._id !== currentUser?.userID &&
            !selectedUsers.some((u) => u._id === user._id),
        ),
      );
    } catch (error) {
      console.error("Error searching users:", error);
    }
  };

  const handleAddUser = (user: User) => {
    setSelectedUsers([...selectedUsers, user]);
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleRemoveUser = (userId: string) => {
    // Don't allow removing the channel creator
    if (userId === channel.createdBy._id) return;
    setSelectedUsers(selectedUsers.filter((user) => user._id !== userId));
  };

  const handleSave = () => {
    if (channelName.trim()) {
      onSave(channel._id, {
        name: channelName,
        users: selectedUsers.map((user) => user._id),
      });
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Channel</DialogTitle>
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
              <Label>Channel Members</Label>
              <ScrollArea className="h-[100px] border rounded-md p-2">
                {selectedUsers.map((user) => (
                  <div
                    key={user._id}
                    className="flex items-center justify-between p-2"
                  >
                    <div className="flex items-center gap-2">
                      <span>{user.username}</span>
                      {user._id === channel.createdBy._id && (
                        <span className="text-xs text-gray-500">(Creator)</span>
                      )}
                    </div>
                    {user._id !== channel.createdBy._id && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveUser(user._id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </ScrollArea>
            </div>
          </div>
        </div>
        <Button
          variant="destructive"
          onClick={() => {
            onArchive(channel._id);
            onClose();
          }}
          className="mt-4"
        >
          Delete Channel
        </Button>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
