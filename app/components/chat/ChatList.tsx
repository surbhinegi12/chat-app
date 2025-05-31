"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { TiHome } from "react-icons/ti";
import { AiFillMessage } from "react-icons/ai";
import { GoGraph } from "react-icons/go";
import { HiUserGroup, HiSpeakerphone, HiOutlineSparkles } from "react-icons/hi";
import { RiFolderImageFill } from "react-icons/ri";
import { IoIosSettings } from "react-icons/io";
import { FiSearch } from "react-icons/fi";
import { BsFilter } from "react-icons/bs";
import { RiMenuAddFill } from "react-icons/ri";
import { MdChecklist } from "react-icons/md";
import { RiContactsBookFill } from "react-icons/ri";
import { IoTicket } from "react-icons/io5";
import { VscDesktopDownload } from "react-icons/vsc";
import { format } from "date-fns";

interface ChatListProps {
  selectedChat: any;
  onChatSelect: (chat: any) => void;
  currentUser: any;
}

interface ChatMember {
  chat: {
    id: string;
    type: "private" | "group";
    name?: string;
    members: Array<{
      user: {
        id: string;
        full_name: string;
      };
    }>;
    last_message: Array<{
      id: string;
      content: string;
      created_at: string;
      sender: {
        id: string;
        full_name: string;
      };
    }>;
  };
}

export default function ChatList({
  selectedChat,
  onChatSelect,
  currentUser,
}: ChatListProps) {
  const [chats, setChats] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    type: "all", // all, private, group
    label: "all",
  });

  useEffect(() => {
    if (!currentUser) return;

    // Subscribe to chats
    const fetchChats = async () => {
      const { data: chatMembers } = await supabase
        .from("chat_members")
        .select(
          `
          chat:chats (
            *,
            members:chat_members(
              user:users(*)
            ),
            last_message:messages(
              *,
              sender:users(*)
            )
          )
        `
        )
        .eq("user_id", currentUser.id)
        .order("joined_at", { ascending: false });

      if (chatMembers) {
        const formattedChats = (chatMembers as unknown as ChatMember[]).map(
          (cm) => ({
            ...cm.chat,
            members: cm.chat.members.map((m: any) => m.user),
            lastMessage: cm.chat.last_message?.[0],
          })
        );
        setChats(formattedChats);
      }
    };

    fetchChats();

    // Subscribe to new messages
    const subscription = supabase
      .channel("messages")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
        },
        () => {
          fetchChats(); // Refresh chats when new message arrives
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [currentUser]);

  const filteredChats = chats.filter((chat) => {
    // Search filter
    const searchMatch =
      searchQuery === "" ||
      chat.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chat.members.some((member: any) =>
        member.full_name.toLowerCase().includes(searchQuery.toLowerCase())
      );

    // Type filter
    const typeMatch =
      filters.type === "all" ||
      (filters.type === "private" && chat.type === "private") ||
      (filters.type === "group" && chat.type === "group");

    return searchMatch && typeMatch;
  });

  return (
    <div className="flex h-full">
      {/* Left Sidebar Navigation */}
      <nav className="w-[72px] bg-white border-r border-gray-200 flex flex-col items-center py-4">
        <div className="flex-1 flex flex-col items-center space-y-6">
          <button className="p-3 hover:bg-gray-100 text-gray-500">
            <TiHome className="w-6 h-6" />
          </button>
          <div className="relative">
            <button className="p-3 bg-green-50 text-green-600 rounded-lg relative">
              <AiFillMessage className="w-6 h-6" />
              <span className="absolute -top-1 -right-1 bg-green-500 text-white text-xs font-medium px-1.5 rounded-full min-w-[1.25rem] h-5 flex items-center justify-center">
                12
              </span>
            </button>
          </div>
          <button className="p-3 hover:bg-gray-100 text-gray-500">
            <IoTicket className="w-6 h-6" />
          </button>
          <button className="p-3 hover:bg-gray-100 text-gray-500">
            <GoGraph className="w-6 h-6" />
          </button>
          <button className="p-3 hover:bg-gray-100 text-gray-500">
            <MdChecklist className="w-6 h-6" />
          </button>
          <button className="p-3 hover:bg-gray-100 text-gray-500">
            <HiSpeakerphone className="w-6 h-6" />
          </button>
          <button className="p-3 hover:bg-gray-100 text-gray-500">
            <HiUserGroup className="w-6 h-6" />
          </button>
          <button className="p-3 hover:bg-gray-100 text-gray-500">
            <RiContactsBookFill className="w-6 h-6" />
          </button>
          <button className="p-3 hover:bg-gray-100 text-gray-500">
            <RiFolderImageFill className="w-6 h-6" />
          </button>
          <button className="p-3 hover:bg-gray-100 text-gray-500">
            <VscDesktopDownload className="w-6 h-6" />
          </button>
        </div>
        <div className="mt-auto">
          <button className="p-3 hover:bg-gray-100 text-gray-500">
            <IoIosSettings className="w-6 h-6" />
          </button>
        </div>
      </nav>

      {/* Chat List Section */}
      <div
        className="flex-1 flex flex-col bg-white relative"
        style={{ width: "26rem", minWidth: "26rem" }}
      >
        {/* Search and Filter Section */}
        <div className="px-4 py-3">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <button className="flex items-center space-x-1.5 text-green-600 text-sm font-medium hover:text-green-700">
                <RiMenuAddFill className="w-4 h-4" />
                <span>Custom filter</span>
              </button>
              <button className="px-3 py-1.5 text-gray-600 bg-white border border-gray-200 rounded-lg text-sm hover:bg-gray-50">
                Save
              </button>
            </div>

            <div className="flex-1 flex items-center space-x-3">
              <div className="flex-1">
                <div className="flex items-center bg-gray-50 rounded-lg px-3 py-1.5">
                  <FiSearch className="text-gray-400 w-4 h-4 min-w-[16px]" />
                  <input
                    type="text"
                    placeholder="Search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full ml-2 text-gray-600 bg-transparent focus:outline-none text-sm placeholder-gray-500"
                  />
                </div>
              </div>

              <div className="flex-shrink-0">
                <button className="whitespace-nowrap flex items-center space-x-1.5 px-3 py-1.5 bg-green-50 text-green-600 rounded-lg text-sm font-medium hover:bg-green-100">
                  <BsFilter className="w-4 h-4 min-w-[16px]" />
                  <span>Filtered</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          {filteredChats.map((chat) => {
            const otherMembers = chat.members.filter(
              (m: any) => m.id !== currentUser?.id
            );
            const chatName =
              chat.type === "private"
                ? otherMembers[0]?.full_name
                : chat.name || "Unnamed Group";

            return (
              <div
                key={chat.id}
                onClick={() => onChatSelect(chat)}
                className={`flex items-start space-x-3 px-4 py-3 hover:bg-gray-50 cursor-pointer ${
                  selectedChat?.id === chat.id ? "bg-gray-50" : ""
                }`}
              >
                {/* Avatar */}
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                    <span className="text-gray-600 font-medium text-lg">
                      {chat.type === "private"
                        ? otherMembers[0]?.full_name[0]
                        : chat.name?.[0] || "G"}
                    </span>
                  </div>
                </div>

                {/* Chat Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {chatName}
                      </h3>
                      <div className="flex items-center space-x-1.5">
                        {chat.type === "private" && (
                          <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                            Demo
                          </span>
                        )}
                        {chat.type === "group" && (
                          <span className="px-2 py-0.5 text-xs bg-blue-50 text-blue-600 rounded">
                            internal
                          </span>
                        )}
                        {chat.unread_count > 0 && (
                          <span className="px-1.5 py-0.5 text-xs bg-green-500 text-white rounded">
                            +{chat.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-gray-500">
                      {chat.lastMessage
                        ? format(
                            new Date(chat.lastMessage.created_at),
                            "dd-MMM-yy"
                          )
                        : ""}
                    </span>
                  </div>
                  <div className="mt-1">
                    <p className="text-sm text-gray-500 truncate">
                      {chat.lastMessage?.content || "No messages yet"}
                    </p>
                    {chat.type === "private" &&
                      otherMembers[0]?.mobile_number && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          {otherMembers[0].mobile_number}
                        </p>
                      )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Icons */}
        <div className="absolute bottom-4 left-4 flex items-center space-x-4">
          <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
            <HiOutlineSparkles className="w-5 h-5" />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
            <IoIosSettings className="w-5 h-5" />
          </button>
        </div>

        {/* Floating New Chat Button */}
        <button className="absolute bottom-4 right-4 w-12 h-12 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center text-white shadow-lg">
          <AiFillMessage className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
