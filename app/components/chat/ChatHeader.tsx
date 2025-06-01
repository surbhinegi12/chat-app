"use client";

import { useState } from "react";
import { IoSearchOutline } from "react-icons/io5";
import { BsThreeDots } from "react-icons/bs";
import { HiUserAdd, HiSparkles } from "react-icons/hi";
import { MdGroups } from "react-icons/md";
import AddMembersDialog from "./AddMembersDialog";

interface ChatHeaderProps {
  chat: {
    id: string;
    type: "private" | "group";
    name?: string;
    members: Array<{
      id: string;
      full_name: string;
      avatar_url?: string;
      online_status?: boolean;
    }>;
  };
  onChatUpdated?: () => void;
}

export default function ChatHeader({ chat, onChatUpdated }: ChatHeaderProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showAddMemberDialog, setShowAddMemberDialog] = useState(false);
  const [memberStatuses] = useState(() => 
    // Generate random statuses once when component mounts
    chat.members.reduce((acc, member) => {
      acc[member.id] = Math.random() > 0.5;
      return acc;
    }, {} as Record<string, boolean>)
  );

  // Get chat name or first member's name for private chats
  const chatName = chat.type === "private" 
    ? chat.members[0]?.full_name 
    : chat.name || "Unnamed Group";

  // Get member names for display
  const memberNames = chat.members.map(m => m.full_name).join(", ");

  // Get visible members (first 5) and remaining count
  const visibleMembers = chat.members.slice(0, 5);
  const remainingCount = chat.members.length > 5 ? chat.members.length - 5 : 0;

  return (
    <>
      <header className="h-16 px-4 flex items-center justify-between border-b border-gray-200 bg-white">
        <div className="flex items-center space-x-3">
          {chat.type === "private" ? (
            <div className="relative">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 relative z-10">
                <img
                  src={chat.members[0]?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${chat.members[0]?.id}`}
                  alt={chat.members[0]?.full_name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.onerror = null;
                    target.style.display = 'none';
                    target.parentElement!.innerHTML = `<span class="w-full h-full flex items-center justify-center text-gray-600 font-medium">${chat.members[0]?.full_name[0]}</span>`;
                  }}
                />
              </div>
              <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white z-20 ${memberStatuses[chat.members[0]?.id] ? 'bg-green-500' : 'bg-gray-400'}`}></div>
            </div>
          ) : (
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
              <MdGroups className="w-6 h-6 text-gray-600" />
            </div>
          )}

          <div>
            <div className="flex items-center">
              <h2 className="text-[15px] font-semibold text-gray-900">{chatName}</h2>
            </div>
            <p className="text-[13px] text-gray-500 font-normal">
              {memberNames}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {chat.type === "group" && (
            <div className="flex -space-x-2 mr-2">
              {visibleMembers.map((member, index) => (
                <div key={member.id} className="relative">
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-100 border-2 border-white relative z-10">
                    <img
                      src={member.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.id}`}
                      alt={member.full_name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.onerror = null;
                        target.style.display = 'none';
                        target.parentElement!.innerHTML = `<span className="w-full h-full flex items-center justify-center text-gray-600 font-medium text-[15px]">${member.full_name[0]}</span>`;
                      }}
                    />
                  </div>
                  <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white z-20 ${memberStatuses[member.id] ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                </div>
              ))}
              {remainingCount > 0 && (
                <div className="w-8 h-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-[13px] text-gray-600 font-normal relative z-10">
                  +{remainingCount}
                </div>
              )}
            </div>
          )}
          <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full">
            <HiSparkles className="w-5 h-5" />
          </button>
          <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full">
            <IoSearchOutline className="w-5 h-5" />
          </button>
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
            >
              <BsThreeDots className="w-5 h-5" />
            </button>

            {showMenu && (
              <>
                <div 
                  className="fixed inset-0" 
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
                  <div className="py-1" role="menu">
                    {chat.type === "group" && (
                      <button
                        onClick={() => {
                          setShowAddMemberDialog(true);
                          setShowMenu(false);
                        }}
                        className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        role="menuitem"
                      >
                        <HiUserAdd className="w-4 h-4 mr-2" />
                        Add member
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
              </>
            )}
          </div>
        </div>
      </header>

      <AddMembersDialog
        isOpen={showAddMemberDialog}
        onClose={() => setShowAddMemberDialog(false)}
        chatId={chat.id}
        currentMembers={chat.members}
        onMemberAdded={() => {
          onChatUpdated?.();
          setShowAddMemberDialog(false);
        }}
      />
    </>
  );
} 