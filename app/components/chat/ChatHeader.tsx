"use client";

import { useState } from "react";
import { IoEllipsisVertical, IoSearchOutline } from "react-icons/io5";
import { BsArrowRepeat, BsThreeDots } from "react-icons/bs";

interface ChatHeaderProps {
  chat: {
    id: string;
    type: "private" | "group";
    name?: string;
    members: Array<{
      id: string;
      full_name: string;
    }>;
  };
}

export default function ChatHeader({ chat }: ChatHeaderProps) {
  const [showMenu, setShowMenu] = useState(false);

  // Get chat name or first member's name for private chats
  const chatName = chat.type === "private" 
    ? chat.members[0]?.full_name 
    : chat.name || "Unnamed Group";

  return (
    <header className="h-16 px-4 flex items-center justify-between border-b border-gray-200 bg-white">
      <div className="flex items-center space-x-3">
        {chat.type === "private" ? (
          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
            <span className="text-gray-600 font-medium">
              {chat.members[0]?.full_name[0]}
            </span>
          </div>
        ) : (
          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
            <span className="text-gray-600 font-medium">
              {chat.name?.[0] || "G"}
            </span>
          </div>
        )}

        <div>
          <div className="flex items-center space-x-2">
            <h2 className="font-medium">{chatName}</h2>
            <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
              Demo
            </span>
          </div>
          <p className="text-sm text-gray-500">
            {chat.type === "group" 
              ? `${chat.members.length} members`
              : "Last seen recently"}
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full">
          <IoSearchOutline className="w-5 h-5" />
        </button>
        <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full">
          <BsArrowRepeat className="w-5 h-5" />
        </button>
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
          >
            <BsThreeDots className="w-5 h-5" />
          </button>

          {showMenu && (
            <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
              <div className="py-1" role="menu">
                {chat.type === "group" && (
                  <button
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    role="menuitem"
                  >
                    Manage members
                  </button>
                )}
                <button
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  role="menuitem"
                >
                  Search in chat
                </button>
                <button
                  className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                  role="menuitem"
                >
                  Leave chat
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
} 