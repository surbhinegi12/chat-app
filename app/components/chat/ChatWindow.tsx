"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "../../../lib/supabase";
import { format, isToday, isYesterday, isSameDay } from "date-fns";
import { IoSend } from "react-icons/io5";
import { BsEmojiSmile, BsThreeDots, BsListNested } from "react-icons/bs";
import { FiPaperclip } from "react-icons/fi";
import ChatHeader from "./ChatHeader";
import {
  BiSearch,
  BiRefresh,
  BiPencil,
  BiMenu,
  BiGridAlt,
  BiGroup,
  BiAt,
  BiImage,
  BiTime,
  BiCog,
} from "react-icons/bi";
import { FaMicrophone } from "react-icons/fa";
import { GoMention } from "react-icons/go";
import { FiSearch } from "react-icons/fi";
import { LuRefreshCw, LuPencilLine } from "react-icons/lu";
import { TfiMenuAlt } from "react-icons/tfi";
import { HiUserGroup } from "react-icons/hi";
import { MdOutlineAccessTime } from "react-icons/md";
import { IoIosSettings } from "react-icons/io";
import { CgMenuRightAlt } from "react-icons/cg";
import { HiOutlineSparkles } from "react-icons/hi";
import { FaSquarePollHorizontal } from "react-icons/fa6";
import { AiOutlineHistory } from "react-icons/ai";
import { FaHubspot } from "react-icons/fa6";
import { IoGitNetworkOutline } from "react-icons/io5";
import { BsArrowRightShort } from "react-icons/bs";
import { TbLayoutSidebarRightExpandFilled, TbListDetails } from "react-icons/tb";
import { MdGroups } from "react-icons/md";
import { RiFolderImageFill, RiListSettingsLine, RiTelegram2Fill } from "react-icons/ri";

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

interface ChatWindowProps {
  chat: {
    id: string;
    type: "private" | "group";
    name?: string;
    members: Array<{
      id: string;
      full_name: string;
    }>;
    labels?: Array<{
      id: string;
      name: string;
      color: string;
      textColor: string;
    }>;
  };
  currentUser: {
    id: string;
    full_name: string;
    mobile_number?: string;
  };
  onChatSelect: (chat: any) => void;
  onNewMessage: (message: Message) => void;
}

const formatMessageDate = (date: Date) => {
  if (isToday(date)) {
    return "Today";
  } else if (isYesterday(date)) {
    return "Yesterday";
  } else {
    return format(date, "dd-MM-yyyy");
  }
};

export default function ChatWindow({ chat, currentUser, onChatSelect, onNewMessage }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!chat) return;

    let messageSubscription: any = null;

    const setupRealtimeSubscription = async () => {
      // Fetch initial messages
      const { data: initialMessages } = await supabase
        .from("messages")
        .select(
          `
          *,
          sender:users(
            id,
            full_name,
            mobile_number
          )
        `
        )
        .eq("chat_id", chat.id)
        .order("created_at", { ascending: true });

      if (initialMessages) {
        setMessages(initialMessages);
        // Set the latest message
        if (initialMessages.length > 0) {
          onNewMessage(initialMessages[initialMessages.length - 1]);
        }
      }

      // Set up realtime subscription
      messageSubscription = supabase
        .channel(`chat:${chat.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `chat_id=eq.${chat.id}`
          },
          async (payload) => {
            console.log('ChatWindow message received:', payload);

            // Fetch the complete message with sender info
            const { data: newMessage } = await supabase
              .from("messages")
              .select(
                `
                *,
                sender:users(
                  id,
                  full_name,
                  mobile_number
                )
              `
              )
              .eq("id", payload.new.id)
              .single();

            if (newMessage) {
              setMessages(prev => [...prev, newMessage]);
              onNewMessage(newMessage);
            }
          }
        )
        .subscribe(status => {
          console.log(`Chat ${chat.id} subscription status:`, status);
        });
    };

    setupRealtimeSubscription();

    return () => {
      console.log('Cleaning up chat subscription...');
      if (messageSubscription) {
        messageSubscription.unsubscribe();
      }
    };
  }, [chat?.id, onNewMessage]);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    const messageContent = newMessage.trim();
    setNewMessage("");

    try {
      // Send the message first
      const { data, error } = await supabase
        .from("messages")
        .insert({
          chat_id: chat.id,
          sender_id: currentUser.id,
          content: messageContent,
          type: "text",
        })
        .select(`
          *,
          sender:users(
            id,
            full_name,
            mobile_number
          )
        `)
        .single();

      if (error) {
        throw error;
      }

      // No need for optimistic update since we'll get the message through the subscription
      // But we can add it directly to avoid any delay
      if (data) {
        setMessages(prev => [...prev, data]);
        onNewMessage(data);
      }

    } catch (error) {
      console.error("Error sending message:", error);
      alert("Failed to send message. Please try again.");
    }
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    try {
      // Upload file to Supabase Storage
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${chat.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("chat-attachments")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("chat-attachments").getPublicUrl(filePath);

      // Send message with attachment
      const { error: messageError } = await supabase.from("messages").insert({
        chat_id: chat.id,
        sender_id: currentUser.id,
        content: file.name,
        type: file.type.startsWith("image/")
          ? "image"
          : file.type.startsWith("video/")
          ? "video"
          : "file",
        attachment_url: publicUrl,
      });

      if (messageError) throw messageError;
    } catch (error) {
      console.error("Error uploading file:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleChatUpdate = useCallback(async () => {
    // Fetch updated chat data
    const { data: updatedChat } = await supabase
      .from('chats')
      .select(`
        *,
        members:chat_members(
          user:users(*)
        )
      `)
      .eq('id', chat.id)
      .single();

    if (updatedChat) {
      // Update the chat in parent component
      onChatSelect({
        ...updatedChat,
        members: updatedChat.members.map((m: any) => m.user)
      });
    }
  }, [chat.id]);

  const renderMessages = () => {
    let currentDate: string | null = null;
    
    return messages.map((message, index) => {
      const messageDate = new Date(message.created_at);
      const dateStr = formatMessageDate(messageDate);
      let showDateSeparator = false;

      // Show date separator if it's the first message or date changed from previous message
      if (index === 0 || !isSameDay(messageDate, new Date(messages[index - 1].created_at))) {
        showDateSeparator = true;
        currentDate = dateStr;
      }

      return (
        <div key={message.id}>
          {showDateSeparator && (
            <div className="flex items-center justify-center my-4">
              <div className="bg-[#E9EDEF] px-3 py-1 rounded-lg">
                <span className="text-sm text-gray-500">{currentDate}</span>
              </div>
            </div>
          )}
          <div
            className={`flex ${
              message.sender_id === currentUser.id
                ? "justify-end"
                : "justify-start"
            } mb-3`}
          >
            <div className="flex flex-col max-w-[65%]">
              <div
                className={`rounded-2xl px-2.5 py-2 ${
                  message.sender_id === currentUser.id
                    ? "bg-[#E7FEDC]"
                    : "bg-white"
                }`}
              >
                {/* Show sender name in group chats for all messages */}
                {chat.type === "group" && (
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`secondary-text font-semibold ${
                        message.sender_id === currentUser.id
                          ? "text-[#0F9152]"
                          : "text-[#3BDB88]"
                      }`}
                    >
                      {message.sender.full_name}
                    </span>
                    <span className="meta-text text-gray-500 font-normal ml-4">
                      {message.sender.mobile_number}
                    </span>
                  </div>
                )}

                {/* Show sender name only for received messages in private chats */}
                {chat.type === "private" &&
                  message.sender_id !== currentUser.id && (
                    <div className="flex items-center justify-between mb-1">
                      <span className="secondary-text font-semibold text-[#3BDB88]">
                        {message.sender.full_name}
                      </span>
                      <span className="meta-text text-gray-500 font-normal ml-4">
                        {message.sender.mobile_number}
                      </span>
                    </div>
                  )}

                {message.type === "text" ? (
                  <>
                    <p className="message-text text-[#0B0B0B] break-words font-normal">
                      {message.content}
                    </p>
                    <div className="flex items-center mt-2">
                      {message.sender_id === currentUser.id && (
                        <span className="meta-text text-gray-500 flex items-center font-normal">
                          <RiTelegram2Fill className="w-3 h-3 mr-1 text-gray-500" />
                          periskope@hashlabs.dev
                        </span>
                      )}
                      <div className="flex items-center ml-auto">
                        <span className="meta-text text-gray-500 font-normal ml-6">
                          {format(new Date(message.created_at), "HH:mm")}
                        </span>
                        {message.sender_id === currentUser.id && (
                          <span className="text-[#53bdeb] flex ml-[2px]">
                            <svg
                              viewBox="0 0 16 11"
                              width="16"
                              height="11"
                              className="fill-current"
                            >
                              <path d="M11.071.653a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178L4.955 6.516 2.226 3.877a.416.416 0 0 0-.33-.165.456.456 0 0 0-.381.178.493.493 0 0 0-.127.33.399.399 0 0 0 .152.305l3.054 2.898c.101.101.216.152.343.152a.494.494 0 0 0 .381-.152l5.693-6.081a.399.399 0 0 0 .152-.33.493.493 0 0 0-.152-.33z" />
                              <path d="M14.929.653a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178L8.813 6.516 8.534 6.237a.421.421 0 0 0-.33-.152.456.456 0 0 0-.33.152.421.421 0 0 0-.153.33.456.456 0 0 0 .153.33l.634.634c.101.101.216.152.343.152a.494.494 0 0 0 .381-.152l5.693-6.081a.399.399 0 0 0 .152-.33.493.493 0 0 0-.152-.33z" />
                            </svg>
                          </span>
                        )}
                      </div>
                    </div>
                  </>
                ) : message.type === "image" ? (
                  <img
                    src={message.attachment_url}
                    alt={message.content}
                    className="max-w-full rounded-lg"
                  />
                ) : message.type === "video" ? (
                  <video
                    src={message.attachment_url}
                    controls
                    className="max-w-full rounded-lg"
                  />
                ) : (
                  <a
                    href={message.attachment_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline font-medium"
                  >
                    📎 {message.content}
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    });
  };

  return (
    <div className="flex flex-1 h-[calc(100vh-128px)] overflow-hidden">
      <div className="flex-1 flex flex-col">
        <ChatHeader 
          chat={chat} 
          onChatUpdated={handleChatUpdate}
        />
        {/* Messages */}
        <div
          className="flex-1 overflow-y-auto px-0 py-2 space-y-1"
          style={{
            backgroundImage: `url("/background.png")`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundAttachment: "fixed",
          }}
        >
          <div className="w-full px-2">
            {renderMessages()}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Message Input */}
        <div
          className="flex-shrink-0 py-4 bg-white border-t border-gray-200"
        >
          <div className="w-full px-4">
            <div className="flex flex-col space-y-3">
              <div className="flex items-center w-full">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Message..."
                  className="flex-1 px-4 py-2.5 bg-gray-100 rounded-l-lg border-0 focus:outline-none focus:ring-0 text-sm text-gray-900"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                  className={`px-4 py-2.5 rounded-r-lg ${
                    newMessage.trim()
                      ? "bg-green-500 hover:bg-green-600"
                      : "bg-gray-200"
                  }`}
                >
                  <IoSend
                    className={`w-5 h-5 ${
                      newMessage.trim() ? "text-white" : "text-gray-400"
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-6">
                  <button className="text-gray-500 hover:text-gray-700">
                    <FiPaperclip className="w-5 h-5" />
                  </button>
                  <button className="text-gray-500 hover:text-gray-700">
                    <BsEmojiSmile className="w-5 h-5" />
                  </button>
                  <button className="text-gray-500 hover:text-gray-700">
                    <MdOutlineAccessTime className="w-5 h-5" />
                  </button>
                  <button className="text-gray-500 hover:text-gray-700">
                    <AiOutlineHistory className="w-5 h-5" />
                  </button>
                  <button className="text-gray-500 hover:text-gray-700">
                    <HiOutlineSparkles className="w-5 h-5" />
                  </button>
                  <button className="text-gray-500 hover:text-gray-700">
                    <FaSquarePollHorizontal className="w-5 h-5" />
                  </button>
                  <button className="text-gray-500 hover:text-gray-700">
                    <FaMicrophone className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex items-center">
                  <span className="text-sm text-gray-500 whitespace-nowrap">
                    Periskope
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Toolbar */}
      <nav className="w-[72px] bg-white border-l border-gray-200 flex flex-col items-center py-2">
        <div className="flex-1 flex flex-col items-center space-y-2">
          <button className="p-2 hover:bg-gray-100 text-gray-500">
            <TbLayoutSidebarRightExpandFilled className="w-5 h-5" />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
            <LuRefreshCw className="w-5 h-5" />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
            <LuPencilLine className="w-5 h-5" />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
            <BsListNested className="w-5 h-5" />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
            <TbListDetails className="w-5 h-5" />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
            <FaHubspot className="w-5 h-5" />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
            <MdGroups className="w-5 h-5" />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
            <GoMention className="w-5 h-5" />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
            <RiFolderImageFill className="w-5 h-5" />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
            <RiListSettingsLine className="w-5 h-5" />
          </button>
        </div>
      </nav>
    </div>
  );
}
