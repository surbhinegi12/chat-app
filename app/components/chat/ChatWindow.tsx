"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { format } from "date-fns";
import { IoSend } from "react-icons/io5";
import { BsEmojiSmile, BsThreeDots } from "react-icons/bs";
import { FiPaperclip } from "react-icons/fi";
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

interface Message {
  id: string;
  content: string;
  sender_id: string;
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
  };
  currentUser: {
    id: string;
    full_name: string;
    mobile_number?: string;
  };
}

export default function ChatWindow({ chat, currentUser }: ChatWindowProps) {
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

    // Fetch messages
    const fetchMessages = async () => {
      const { data } = await supabase
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

      if (data) {
        setMessages(data);
      }
    };

    fetchMessages();

    // Subscribe to new messages
    const subscription = supabase
      .channel(`chat:${chat.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `chat_id=eq.${chat.id}`,
        },
        async (payload) => {
          // Fetch the complete message with sender info
          const { data } = await supabase
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

          if (data) {
            setMessages((prev) => [...prev, data]);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [chat]);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    const messageContent = newMessage.trim();
    setNewMessage("");

    // Optimistically add the message to the UI
    const optimisticMessage: Message = {
      id: Date.now().toString(),
      content: messageContent,
      sender_id: currentUser.id,
      created_at: new Date().toISOString(),
      type: "text",
      sender: currentUser,
      attachment_url: undefined,
    };
    setMessages((prev) => [...prev, optimisticMessage]);

    try {
      const { error } = await supabase.from("messages").insert({
        chat_id: chat.id,
        sender_id: currentUser.id,
        content: messageContent,
        type: "text",
      });

      if (error) throw error;
    } catch (error) {
      console.error("Error sending message:", error);
      // Remove the optimistic message if there was an error
      setMessages((prev) =>
        prev.filter((msg) => msg.id !== optimisticMessage.id)
      );
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

  return (
    <div className="flex flex-1 h-[calc(100vh-128px)] overflow-hidden">
      <div className="flex-1 flex flex-col">
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
          <div
            className="w-full max-w-[1200px] mx-auto px-8"
            style={{ marginLeft: "70px" }}
          >
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.sender_id === currentUser.id
                    ? "justify-end"
                    : "justify-start"
                } mb-1`}
              >
                <div className="flex flex-col max-w-[750px]">
                  <div
                    className={`rounded-2xl px-3 py-2 ${
                      message.sender_id === currentUser.id
                        ? "bg-[#E7FFDB]"
                        : "bg-white"
                    }`}
                  >
                    {/* Show sender name in group chats for all messages */}
                    {chat.type === "group" && (
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={`text-[13px] font-medium ${
                            message.sender_id === currentUser.id
                              ? "text-[#1fa855]"
                              : "text-[#1fa855]"
                          }`}
                        >
                          {message.sender.full_name}
                        </span>
                        <span className="text-xs text-gray-500 ml-4">
                          {message.sender.mobile_number}
                        </span>
                      </div>
                    )}

                    {/* Show sender name only for received messages in private chats */}
                    {chat.type === "private" &&
                      message.sender_id !== currentUser.id && (
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[13px] font-medium text-[#1fa855]">
                            {message.sender.full_name}
                          </span>
                          <span className="text-xs text-gray-500 ml-4">
                            {message.sender.mobile_number}
                          </span>
                        </div>
                      )}

                    {message.type === "text" ? (
                      <>
                        <p className="text-[15px] text-gray-800 font-normal leading-tight break-words">
                          {message.content}
                        </p>
                        <div className="flex items-center mt-0.5">
                          {message.sender_id === currentUser.id && (
                            <span className="text-[11px] text-gray-400 flex items-center">
                              <svg
                                viewBox="0 0 8 8"
                                width="8"
                                height="8"
                                className="fill-current mr-1 opacity-75"
                              >
                                <path d="M4.5 1L2 3.5V5l1.5-1.5L7 7V5.5L4.5 1z" />
                              </svg>
                              periskope@hashlabs.dev
                            </span>
                          )}
                          <div className="flex items-center ml-auto">
                            <span className="text-[11px] text-gray-400 ml-6">
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
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Message Input */}
        <div
          className="flex-shrink-0 py-4 bg-white border-t border-gray-200"
          style={{ marginLeft: "68px" }}
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
                    <HiOutlineSparkles className="w-5 h-5" />
                  </button>
                  <button className="text-gray-500 hover:text-gray-700">
                    <FaHubspot className="w-5 h-5" />
                  </button>
                  <button className="text-gray-500 hover:text-gray-700">
                    <IoGitNetworkOutline className="w-5 h-5" />
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
      <nav className="w-[72px] bg-white border-l border-gray-200 flex flex-col items-center py-6 flex-shrink-0">
        <div className="flex-1 flex flex-col items-center space-y-8">
          <button className="p-2.5 hover:bg-gray-100 rounded-lg text-gray-500">
            <FiSearch className="w-5 h-5" />
          </button>
          <button className="p-2.5 hover:bg-gray-100 rounded-lg text-gray-500">
            <LuRefreshCw className="w-5 h-5" />
          </button>
          <button className="p-2.5 hover:bg-gray-100 rounded-lg text-gray-500">
            <LuPencilLine className="w-5 h-5" />
          </button>
          <button className="p-2.5 hover:bg-gray-100 rounded-lg text-gray-500">
            <TfiMenuAlt className="w-5 h-5" />
          </button>
          <button className="p-2.5 hover:bg-gray-100 rounded-lg text-gray-500">
            <CgMenuRightAlt className="w-5 h-5" />
          </button>
          <button className="p-2.5 hover:bg-gray-100 rounded-lg text-gray-500">
            <HiOutlineSparkles className="w-5 h-5" />
          </button>
          <button className="p-2.5 hover:bg-gray-100 rounded-lg text-gray-500">
            <HiUserGroup className="w-5 h-5" />
          </button>
          <button className="p-2.5 hover:bg-gray-100 rounded-lg text-gray-500">
            <FaSquarePollHorizontal className="w-5 h-5" />
          </button>
          <button className="p-2.5 hover:bg-gray-100 rounded-lg text-gray-500">
            <AiOutlineHistory className="w-5 h-5" />
          </button>
        </div>
        <div className="mt-auto pt-6">
          <button className="p-2.5 hover:bg-gray-100 rounded-lg text-gray-500">
            <IoIosSettings className="w-5 h-5" />
          </button>
        </div>
      </nav>
    </div>
  );
}
