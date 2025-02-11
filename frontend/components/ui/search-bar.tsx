"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Search } from "lucide-react";
import Link from "next/link";

interface SearchBarProps {
  onSearch: (query: string) => void;
  userResults: UserResult[];
  messageResults: MessageResult[];
}

export default function SearchBar({
  onSearch,
  userResults = [],
  messageResults = [],
}: SearchBarProps) {
  const [query, setQuery] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    onSearch(value);
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Search Input */}
      <div className="flex items-center gap-2 bg-white dark:bg-gray-900 p-2 rounded-md shadow">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            className="w-full border border-gray-300 dark:border-gray-700 px-10 py-2 rounded-md text-sm"
            placeholder="Search users or messages..."
            value={query}
            onChange={handleChange}
          />
        </div>

        <Button className="ml-2" onClick={() => onSearch(query)}>
          Search
        </Button>
      </div>

      {/* Search Results */}
      {(userResults.length > 0 || messageResults.length > 0) && (
        <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded-md shadow-md max-h-40 overflow-y-auto">
          {/* User Profiles */}
          {userResults.length > 0 && (
            <div className="mb-2">
              <h2 className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                User Profiles
              </h2>
              <ul className="space-y-2">
                {userResults.map((user) => (
                  <li
                    key={user._id}
                    className="flex items-center gap-3 p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md cursor-pointer"
                  >
                    <Avatar className="bg-gray-200 dark:bg-gray-700">
                      <AvatarFallback>
                        {user.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <Link
                        href={`/profile/${user._id}`}
                        className="text-blue-500 hover:underline font-semibold"
                      >
                        {user.username}
                      </Link>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Messages */}
          {messageResults.length > 0 && (
            <div className="mt-2">
              <h2 className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                Messages
              </h2>
              <ul className="space-y-2">
                {messageResults.map((msg) => (
                  <li
                    key={msg._id}
                    className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md cursor-pointer"
                  >
                    <p className="text-sm">
                      <span className="font-semibold">{msg.senderName}:</span>{" "}
                      {msg.content}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
