"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "../../../lib/supabase";
import { TiHome, TiFlowMerge } from "react-icons/ti";
import { AiFillMessage } from "react-icons/ai";
import { GoGraph } from "react-icons/go";
import { HiSpeakerphone, HiOutlineSparkles } from "react-icons/hi";
import { RiFolderImageFill } from "react-icons/ri";
import { IoIosSettings } from "react-icons/io";
import { FiSearch } from "react-icons/fi";
import { BsFilter } from "react-icons/bs";
import { RiMenuAddFill } from "react-icons/ri";
import { MdChecklist } from "react-icons/md";
import { RiContactsBookFill } from "react-icons/ri";
import { IoTicket } from "react-icons/io5";
import { VscDesktopDownload } from "react-icons/vsc";
import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";
import { Menu, Transition } from "@headlessui/react";
import { BsThreeDots } from "react-icons/bs";
import { ChevronDownIcon } from "@heroicons/react/20/solid";
import { Fragment } from "react";
import NewChatDialog from "./NewChatDialog";
import { TfiMenuAlt } from "react-icons/tfi";
import { TbStarsFilled } from "react-icons/tb";
import { TbLayoutSidebarLeftExpandFilled } from "react-icons/tb";
import { MdGroups } from "react-icons/md";
import { MdOutlineLocalPhone } from "react-icons/md";

interface Label {
  id: string;
  name: string;
  color: string;
  textColor: string;
}

interface Message {
  id: string;
  content: string;
  sender_id: string;
  chat_id: string;
  created_at: string;
  type: "text" | "image" | "video" | "file";
  attachment_url?: string;
  sender: {
    id: string;
    full_name: string;
    mobile_number?: string;
  };
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

interface ChatListProps {
  selectedChat: any;
  onChatSelect: (chat: any) => void;
  currentUser: any;
  latestMessages: { [key: string]: Message };
  onRefreshChats?: (callback: () => Promise<void>) => void;
}

const getLabelStyle = (labelName: string) => {
  switch (labelName.toLowerCase()) {
    case "dont send":
      return {
        textColor: "#FF4D4F",
        bgColor: "#FFF2F2",
      };
    case "demo":
      return {
        textColor: "#B4876C",
        bgColor: "#FEF6F3",
      };
    case "signup":
      return {
        textColor: "#3BDB88",
        bgColor: "#F4FDF8",
      };
    case "internal":
      return {
        textColor: "#3BDB88",
        bgColor: "#F4FDF8",
      };
    case "content":
      return {
        textColor: "#3BDB88",
        bgColor: "#F4FDF8",
      };
    default:
      return {
        textColor: "#3BDB88",
        bgColor: "#F4FDF8",
      };
  }
};

export default function ChatList({
  selectedChat,
  onChatSelect,
  currentUser,
  latestMessages,
  onRefreshChats,
}: ChatListProps) {
  const [chats, setChats] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    type: "all",
    label: "all",
  });
  const [labels, setLabels] = useState<Label[]>([]);
  const [showLabelModal, setShowLabelModal] = useState(false);
  const [selectedChatForLabel, setSelectedChatForLabel] = useState<any>(null);
  const [longPressTimeout, setLongPressTimeout] = useState<NodeJS.Timeout | null>(null);
  const [showNewChatDialog, setShowNewChatDialog] = useState(false);

  // Fetch labels
  useEffect(() => {
    const fetchLabels = async () => {
      const { data: labelsData } = await supabase
        .from("chat_labels")
        .select("*")
        .order("name");
      if (labelsData) {
        // Update label colors with exact brand colors
        const updatedLabels = labelsData.map((label) => {
          let textColor = "";
          let bgColor = "";

          switch (label.name.toLowerCase()) {
            case "content":
              textColor = "#3BDB88";
              bgColor = "#F4FDF8";
              break;
            case "demo":
              textColor = "#B4876C";
              bgColor = "#FEF6F3";
              break;
            case "dont send":
              textColor = "#FF4D4F";
              bgColor = "#FFF2F2";
              break;
            case "signup":
              textColor = "#3BDB88";
              bgColor = "#F4FDF8";
              break;
            case "internal":
              textColor = "#3BDB88";
              bgColor = "#F4FDF8";
              break;
            default:
              textColor = "#3BDB88";
              bgColor = "#F4FDF8";
          }

          return {
            ...label,
            color: bgColor,
            textColor: textColor,
          };
        });
        setLabels(updatedLabels);
      }
    };

    fetchLabels();

    // Subscribe to label changes
    const subscription = supabase
      .channel("labels")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_labels",
        },
        () => {
          fetchLabels(); // Refresh labels when they change
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchChats = useCallback(async () => {
    console.log("Fetching chats...");

    const { data: chatMembers, error: chatsError } = await supabase
      .from("chat_members")
      .select(
        `
        chat:chats (
          *,
          members:chat_members(
            user:users(*)
          ),
          labels:chat_label_assignments(
            label:chat_labels(*)
          ),
          messages:messages(
            *,
            sender:users(*)
          )
        )
      `
      )
      .eq("user_id", currentUser.id);

    if (chatsError) {
      console.error("Error fetching chats:", chatsError);
      return;
    }

    if (!chatMembers) return;

    // Format and sort chats
    const formattedChats = chatMembers.map((cm: any) => {
      const messages = cm.chat.messages || [];
      const sortedMessages = [...messages].sort(
        (a: any, b: any) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      // Only filter out current user for private chats
      const members = cm.chat.members.map((m: any) => m.user);
      const displayMembers = cm.chat.type === "private" 
        ? members.filter((m: any) => m.id !== currentUser.id)
        : members;

      return {
        ...cm.chat,
        members: displayMembers,
        messages: sortedMessages,
        lastMessage: sortedMessages[0] || null,
        labels: cm.chat.labels?.map((l: any) => l.label).filter(Boolean) || [],
      };
    });

    // Sort chats by latest message timestamp
    const sortedChats = formattedChats.sort((a: any, b: any) => {
      const aTime = a.lastMessage?.created_at || a.created_at;
      const bTime = b.lastMessage?.created_at || b.created_at;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });

    console.log("Setting new chats:", sortedChats);
    setChats(sortedChats);
  }, [currentUser?.id]);

  // Set up refresh callback
  useEffect(() => {
    if (onRefreshChats) {
      onRefreshChats(fetchChats);
    }
  }, [fetchChats, onRefreshChats]);

  // Initial fetch and subscription setup
  useEffect(() => {
    if (!currentUser) return;

    fetchChats();

    // Subscribe to chat_members changes
    const membershipSubscription = supabase
      .channel('chat_members_changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'chat_members',
          filter: `user_id=eq.${currentUser.id}`
        },
        () => {
          console.log('Chat membership changed, refreshing chats...');
          fetchChats();
        }
      )
      .subscribe();

    // Subscribe to messages changes
    const messagesSubscription = supabase
      .channel('messages_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        () => {
          console.log('New message received, refreshing chats...');
          fetchChats();
        }
      )
      .subscribe();

    return () => {
      membershipSubscription.unsubscribe();
      messagesSubscription.unsubscribe();
    };
  }, [currentUser, fetchChats]);

  // Add useEffect to sort chats when latestMessages changes
  useEffect(() => {
    if (Object.keys(latestMessages).length === 0) return;

    setChats((prevChats) => {
      return [...prevChats].sort((a, b) => {
        const aLatestMessage = latestMessages[a.id] || a.lastMessage;
        const bLatestMessage = latestMessages[b.id] || b.lastMessage;

        const aTime = aLatestMessage?.created_at || a.created_at;
        const bTime = bLatestMessage?.created_at || b.created_at;

        return new Date(bTime).getTime() - new Date(aTime).getTime();
      });
    });
  }, [latestMessages]);

  const filteredChats = chats.filter((chat) => {
    // Search filter - match against chat name, group name, or member names
    const searchMatch =
      searchQuery === "" ||
      (chat.type === "private" &&
        chat.members.some((member: { full_name: string }) =>
          member.full_name.toLowerCase().includes(searchQuery.toLowerCase())
        )) ||
      (chat.type === "group" &&
        chat.name?.toLowerCase().includes(searchQuery.toLowerCase()));

    // Type filter
    const typeMatch =
      filters.type === "all" ||
      (filters.type === "private" && chat.type === "private") ||
      (filters.type === "group" && chat.type === "group");

    return searchMatch && typeMatch;
  });

  // Handle long press
  const handleMouseDown = (chat: any) => {
    const timeout = setTimeout(() => {
      setSelectedChatForLabel(chat);
      setShowLabelModal(true);
    }, 500); // 500ms for long press
    setLongPressTimeout(timeout);
  };

  const handleMouseUp = () => {
    if (longPressTimeout) {
      clearTimeout(longPressTimeout);
    }
  };

  // Handle label assignment
  const handleLabelAssign = async (labelId: string) => {
    if (!selectedChatForLabel) return;

    try {
      // Check if label is already assigned
      const { data: existingAssignment } = await supabase
        .from("chat_label_assignments")
        .select("*")
        .eq("chat_id", selectedChatForLabel.id)
        .eq("label_id", labelId)
        .single();

      if (existingAssignment) {
        // Remove label if already assigned
        await supabase
          .from("chat_label_assignments")
          .delete()
          .eq("chat_id", selectedChatForLabel.id)
          .eq("label_id", labelId);
      } else {
        // Assign new label
        await supabase.from("chat_label_assignments").insert({
          chat_id: selectedChatForLabel.id,
          label_id: labelId,
          assigned_by: currentUser.id,
        });
      }

      // Optimistically update the UI
      const updatedChats = chats.map((chat) => {
        if (chat.id === selectedChatForLabel.id) {
          const updatedLabels = existingAssignment
            ? chat.labels.filter((l: Label) => l.id !== labelId)
            : [...chat.labels, labels.find((l) => l.id === labelId)];
          return { ...chat, labels: updatedLabels };
        }
        return chat;
      });
      setChats(updatedChats);
    } catch (error) {
      console.error("Error assigning label:", error);
    }
  };

  const formatMessageDate = (date: Date) => {
    if (isToday(date)) {
      return "Today";
    } else if (isYesterday(date)) {
      return "Yesterday";
    } else {
      return format(date, "dd-MMM-yy");
    }
  };

  return (
    <div className="flex h-full">
      {/* Left Sidebar Navigation */}
      <nav className="w-[72px] bg-white border-r border-gray-200 flex flex-col items-center py-2">
        <div className="flex-1 flex flex-col items-center space-y-2">
          <button className="p-2 hover:bg-gray-100 text-gray-500">
            <TiHome className="w-5 h-5" />
          </button>

          {/* Divider */}
          <div className="w-8 h-px bg-gray-200 my-1"></div>

          <div className="relative">
            <button className="p-2 bg-green-50 text-green-600 rounded-lg relative">
              <AiFillMessage className="w-5 h-5" />
              {/* <span className="absolute -top-1 -right-1 bg-green-500 text-white text-xs font-medium px-1.5 rounded-full min-w-[1.25rem] h-5 flex items-center justify-center">
                12
              </span> */}
            </button>
          </div>
          <button className="p-2 hover:bg-gray-100 text-gray-500">
            <IoTicket className="w-5 h-5" />
          </button>
          <button className="p-2 hover:bg-gray-100 text-gray-500">
            <GoGraph className="w-5 h-5" />
          </button>

          {/* Divider */}
          <div className="w-8 h-px bg-gray-200 my-1"></div>

          <button className="p-2 hover:bg-gray-100 text-gray-500">
            <TfiMenuAlt className="w-5 h-5" />
          </button>
          <button className="p-2 hover:bg-gray-100 text-gray-500">
            <HiSpeakerphone className="w-5 h-5" />
          </button>
          <button className="p-2 hover:bg-gray-100 text-gray-500">
            <TiFlowMerge className="w-5 h-5" />
          </button>

          {/* Divider */}
          <div className="w-8 h-px bg-gray-200 my-1"></div>

          <button className="p-2 hover:bg-gray-100 text-gray-500">
            <RiContactsBookFill className="w-5 h-5" />
          </button>
          <button className="p-2 hover:bg-gray-100 text-gray-500">
            <RiFolderImageFill className="w-5 h-5" />
          </button>

          {/* Divider */}
          <div className="w-8 h-px bg-gray-200 my-1"></div>

          <button className="p-2 hover:bg-gray-100 text-gray-500">
            <MdChecklist className="w-5 h-5" />
          </button>
          <button className="p-2 hover:bg-gray-100 text-gray-500">
            <IoIosSettings className="w-5 h-5" />
          </button>
        </div>

        {/* Bottom Icons */}
        <div className="mt-auto flex flex-col space-y-2">
          <button className="p-2 hover:bg-gray-100 text-gray-500">
            <TbStarsFilled className="w-5 h-5" />
          </button>
          <button className="p-2 hover:bg-gray-100 text-gray-500">
            <TbLayoutSidebarLeftExpandFilled className="w-5 h-5" />
          </button>
        </div>
      </nav>

      {/* Chat List Section */}
      <div
        className="flex-1 flex flex-col bg-white relative"
        style={{ width: "28rem", minWidth: "28rem" }}
      >
        {/* Search and Filter Section */}
        <div className="px-4 py-3">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <button className="flex items-center space-x-1.5 text-[#0F8F4F] text-sm font-semibold hover:text-[#0F8F4F]/90">
                <RiMenuAddFill className="w-4 h-4" />
                <span>Custom filter</span>
              </button>
              <button className="px-3 py-1.5 text-gray-600 bg-white border border-gray-200 rounded-lg text-sm font-semibold hover:bg-gray-50">
                Save
              </button>
            </div>

            <div className="flex-1 flex items-center space-x-3">
              <div className="flex-1 relative">
                <div className="flex items-center bg-gray-50 rounded-lg px-3 py-1.5">
                  <FiSearch className="text-gray-400 w-4 h-4 min-w-[16px]" />
                  <input
                    type="text"
                    placeholder="Search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full ml-2 text-gray-600 bg-transparent focus:outline-none text-sm placeholder-gray-500"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-shrink-0">
                <div
                  className={`
                    flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium cursor-pointer w-[100px]
                    ${
                      searchQuery
                        ? "bg-[#0F8F4F] text-white hover:bg-[#0F8F4F]/90"
                        : "bg-green-50 text-[#0F8F4F]"
                    }
                    transition-colors duration-150
                  `}
                >
                  <BsFilter className="w-4 h-4 flex-shrink-0" />
                  <span className="flex items-center">Filtered</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          {filteredChats.map((chat) => {
            const otherMembers = chat.members;
            const chatName =
              chat.type === "private"
                ? otherMembers[0]?.full_name
                : chat.name || "Unnamed Group";

            return (
              <div
                key={chat.id}
                className="relative flex items-start space-x-3 px-4 py-3 hover:bg-gray-50 cursor-pointer"
                onClick={() =>
                  onChatSelect({
                    ...chat,
                    labels: chat.labels || [],
                  })
                }
                onMouseDown={() => handleMouseDown(chat)}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                {/* Avatar section */}
                <div className="flex-shrink-0">
                  {chat.type === "private" ? (
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100">
                      <img
                        src={
                          otherMembers[0]?.avatar_url ||
                          `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherMembers[0]?.id}`
                        }
                        alt={otherMembers[0]?.full_name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Fallback to initial if image fails to load
                          const target = e.target as HTMLImageElement;
                          target.onerror = null; // Prevent infinite loop
                          target.style.display = "none";
                          target.parentElement!.innerHTML = `<span class="w-full h-full flex items-center justify-center text-gray-600 font-medium text-lg">${otherMembers[0]?.full_name[0]}</span>`;
                        }}
                      />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                      <MdGroups className="w-7 h-7 text-gray-600" />
                    </div>
                  )}
                </div>

                {/* Chat Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <h3 className="chat-name font-semibold text-gray-900 truncate">
                        {chatName}
                      </h3>
                    </div>
                    <div className="flex items-center space-x-1">
                      {chat.labels && chat.labels.length > 0 && (
                        <>
                          {chat.labels.slice(0, 2).map((label: Label) => {
                            const style = getLabelStyle(label.name);
                            return (
                              <span
                                key={label.id}
                                className="px-1.5 py-0.5 meta-text font-semibold rounded"
                                style={{
                                  backgroundColor: style.bgColor,
                                  color: style.textColor,
                                }}
                              >
                                {label.name}
                              </span>
                            );
                          })}
                          {chat.labels.length > 2 && (
                            <span className="meta-text text-gray-500 font-semibold">
                              +{chat.labels.length - 2}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  <div className="mt-1">
                    <p className="secondary-text text-gray-500 truncate font-normal">
                      {latestMessages[chat.id]?.content ||
                        chat.lastMessage?.content ||
                        "No messages yet"}
                    </p>
                    <div className="flex items-center justify-between mt-0.5">
                      {chat.type === "private" ? (
                        <div className="flex items-center bg-gray-50 rounded-lg px-2 py-1">
                          <MdOutlineLocalPhone className="w-4 h-4 text-gray-400 mr-1" />
                          <span className="text-xs text-gray-500 font-medium">
                            {otherMembers[0]?.mobile_number}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center bg-gray-50 rounded-lg px-2 py-1">
                          <MdOutlineLocalPhone className="w-4 h-4 text-gray-400 mr-1" />
                          <span className="text-xs text-gray-500 font-medium">
                            {chat.members[0]?.mobile_number}
                            {chat.members.length > 1 && ` +${chat.members.length - 1}`}
                          </span>
                        </div>
                      )}
                      <span className="meta-text text-gray-500 font-normal">
                        {(latestMessages[chat.id] || chat.lastMessage)?.created_at
                          ? formatMessageDate(
                              new Date(
                                (latestMessages[chat.id] || chat.lastMessage).created_at
                              )
                            )
                          : ""}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Label Menu */}
                {selectedChatForLabel?.id === chat.id && (
                  <>
                    <div
                      className="fixed inset-0"
                      onClick={() => setSelectedChatForLabel(null)}
                    />
                    <Menu as="div" className="absolute right-0 top-0 z-50">
                      <Transition
                        as={Fragment}
                        show={true}
                        enter="transition ease-out duration-100"
                        enterFrom="transform opacity-0 scale-95"
                        enterTo="transform opacity-100 scale-100"
                        leave="transition ease-in duration-75"
                        leaveFrom="transform opacity-100 scale-100"
                        leaveTo="transform opacity-0 scale-95"
                      >
                        <Menu.Items
                          static
                          className="absolute right-2 top-8 w-56 origin-top-right divide-y divide-gray-100 rounded-md bg-white shadow-sm ring-1 ring-gray-200 focus:outline-none"
                          style={{ backgroundColor: "white" }}
                        >
                          <div className="px-1 py-1 bg-white">
                            <div className="px-3 py-2.5 text-[15px] font-semibold text-gray-700 border-b border-gray-100">
                              Manage Labels
                            </div>
                            {labels.map((label) => {
                              const isAssigned =
                                selectedChatForLabel?.labels?.some(
                                  (l: Label) => l.id === label.id
                                );
                              return (
                                <Menu.Item key={label.id}>
                                  {({ active }) => (
                                    <button
                                      onClick={(e: React.MouseEvent) => {
                                        e.stopPropagation();
                                        handleLabelAssign(label.id);
                                        setSelectedChatForLabel(null);
                                      }}
                                      className={`
                                        group flex w-full items-center px-3 py-2.5 text-sm
                                        ${
                                          isAssigned
                                            ? "bg-gray-50 text-gray-900"
                                            : "text-gray-700 hover:bg-gray-50"
                                        }
                                      `}
                                    >
                                      <div className="flex items-center justify-between w-full">
                                        <div className="flex items-center">
                                          <span
                                            className={`w-2 h-2 rounded-full mr-2`}
                                            style={{
                                              backgroundColor: label.color,
                                              border: `1px solid ${
                                                label.textColor || "#6DE4A6"
                                              }`,
                                            }}
                                          />
                                          <span className="font-medium">
                                            {label.name}
                                          </span>
                                        </div>
                                        {isAssigned && (
                                          <svg
                                            className="h-4 w-4 text-green-500"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                          >
                                            <path
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                              strokeWidth={2}
                                              d="M5 13l4 4L19 7"
                                            />
                                          </svg>
                                        )}
                                      </div>
                                    </button>
                                  )}
                                </Menu.Item>
                              );
                            })}
                          </div>
                        </Menu.Items>
                      </Transition>
                    </Menu>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Floating New Chat Button */}
        <button
          onClick={() => setShowNewChatDialog(true)}
          className="absolute bottom-4 right-4 w-12 h-12 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center text-white shadow-lg transition-colors duration-150"
        >
          <AiFillMessage className="w-6 h-6" />
        </button>
      </div>

      {/* New Chat Dialog */}
      <NewChatDialog
        isOpen={showNewChatDialog}
        onClose={() => setShowNewChatDialog(false)}
        onChatSelect={onChatSelect}
        currentUser={currentUser}
        onChatCreated={fetchChats}
      />
    </div>
  );
}
