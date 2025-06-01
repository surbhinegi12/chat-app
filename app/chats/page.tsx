"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import ChatList from "@/components/chat/ChatList";
import ChatWindow from "@/components/chat/ChatWindow";
import ChatHeader from "@/components/chat/ChatHeader";
import { useRouter } from "next/navigation";
import { IoHelpCircleOutline, IoSparklesSharp } from "react-icons/io5";
import { BsListTask } from "react-icons/bs";
import { FaMobileAlt } from "react-icons/fa";
import { MdNotificationsOff, MdInstallDesktop } from "react-icons/md";
import { LuRefreshCcwDot } from "react-icons/lu";
import { BsChatDots } from "react-icons/bs";

interface ChatMember {
  chat_id: string;
  chat: {
    id: string;
    type: string;
    members: Array<{
      user: {
        id: string;
        full_name: string;
        mobile_number: string;
      };
    }>;
  };
}

export default function ChatsPage() {
  const router = useRouter();
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshChats, setRefreshChats] = useState<
    (() => Promise<void>) | undefined
  >();
  const [latestMessages, setLatestMessages] = useState<{ [key: string]: any }>(
    {}
  );

  useEffect(() => {
    // Check if user is authenticated
    const checkAuth = () => {
      try {
        const storedUser = localStorage.getItem("user");
        if (!storedUser) {
          router.replace("/login");
          return;
        }

        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error("Auth check error:", error);
        router.replace("/login");
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  useEffect(() => {
    if (!user) return;

    let messageSubscription: any = null;

    const setupMessageSubscription = async () => {
      // First get all chats the user is a member of
      const { data: userChats } = await supabase
        .from("chat_members")
        .select(
          `
          chat_id,
          chat:chats (
            id,
            type,
            members:chat_members (
              user:users (
                id,
                full_name,
                mobile_number
              )
            )
          )
        `
        )
        .eq("user_id", user.id);

      if (!userChats || userChats.length === 0) return;

      // Get the first chat's data
      const { data: chatData } = await supabase
        .from("chats")
        .select(
          `
          *,
          members:chat_members(
            user:users(*)
          ),
          labels:chat_label_assignments(
            label:chat_labels(*)
          )
        `
        )
        .eq("id", userChats[0].chat_id)
        .single();

      if (chatData) {
        // Format chat object for selection
        const formattedChat = {
          ...chatData,
          members: chatData.members.map((m: any) => m.user),
          labels:
            chatData.labels?.map((l: any) => l.label).filter(Boolean) || [],
        };
        setSelectedChat(formattedChat);
      }

      // Create a map of user details for quick lookup
      const userDetailsMap = new Map();
      ((userChats || []) as any[]).forEach((chatMember) => {
        chatMember.chat.members.forEach((member: { user: { id: any } }) => {
          if (member.user) {
            userDetailsMap.set(member.user.id, member.user);
          }
        });
      });

      const chatIds = userChats.map((c) => c.chat_id);
      console.log("User is member of chats:", chatIds);

      // Set up a single subscription for all chats
      messageSubscription = supabase
        .channel("any-changes")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `chat_id=in.(${chatIds.join(",")})`,
          },
          (payload) => {
            console.log("Message received:", payload);

            // Get sender details from our map
            const senderDetails = userDetailsMap.get(payload.new.sender_id);

            if (senderDetails) {
              const newMessage = {
                ...payload.new,
                sender: {
                  id: senderDetails.id,
                  full_name: senderDetails.full_name,
                  mobile_number: senderDetails.mobile_number,
                },
              };

              // Update latest messages immediately
              setLatestMessages((prev) => ({
                ...prev,
                [payload.new.chat_id]: newMessage,
              }));
            }
          }
        )
        .subscribe((status) => {
          console.log("Subscription status:", status);
        });
    };

    setupMessageSubscription();

    return () => {
      if (messageSubscription) {
        messageSubscription.unsubscribe();
      }
    };
  }, [user]);

  // Function to update latest message for a chat
  const updateLatestMessage = (chatId: string, message: any) => {
    setLatestMessages((prev) => ({
      ...prev,
      [chatId]: message,
    }));
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <main className="flex h-screen bg-[#f0f2f5] overflow-hidden">
      {/* Top Toolbar */}
      <div className="fixed top-0 left-0 right-0 h-14 bg-white border-b border-gray-200 flex items-center justify-between pl-[14px] pr-4 z-50">
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <div className="px-3 py-1.5">
              <img src="/logo.png" alt="Logo" className="h-8 w-8" />
            </div>
            <div className="flex items-center space-x-2 pl-4 py-1.5 border-l border-gray-200">
              <BsChatDots className="w-5 h-5 text-gray-500" />
              <span className="text-gray-600 font-bold">chats</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 px-4 py-2 bg-white rounded-lg shadow-sm">
              <LuRefreshCcwDot className="w-5 h-5 text-gray-600" />
              <span className="text-sm text-gray-600 font-medium">Refresh</span>
            </div>
            <div className="flex items-center space-x-2 px-4 py-2 bg-white rounded-lg shadow-sm">
              <IoHelpCircleOutline className="w-5 h-5 text-gray-600" />
              <span className="text-sm text-gray-600 font-medium">Help</span>
            </div>
          </div>

          <div className="flex items-center space-x-2 px-4 py-2 bg-white rounded-lg shadow-sm">
            <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
            <FaMobileAlt className="w-4 h-4 text-gray-600" />
            <span className="text-sm text-gray-600 font-medium">
              5/6 phones
            </span>
            <svg
              className="w-4 h-4 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>

          <div className="flex items-center space-x-3">
            <button className="p-2 bg-white rounded-lg shadow-sm">
              <MdInstallDesktop className="w-5 h-5 text-gray-600" />
            </button>

            <button className="p-2 bg-white rounded-lg shadow-sm">
              <MdNotificationsOff className="w-5 h-5 text-gray-600" />
            </button>

            <div className="flex items-center space-x-2 px-2 py-2 bg-white rounded-lg shadow-sm">
              <IoSparklesSharp className="w-5 h-5 text-yellow-400" />
              <BsListTask className="w-5 h-5 text-gray-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex w-full mt-14 overflow-hidden">
        {/* Left Section - Chat List */}
        <div className="flex flex-col bg-white border-r border-gray-200 flex-shrink-0">
          <ChatList
            selectedChat={selectedChat}
            onChatSelect={setSelectedChat}
            currentUser={user}
            latestMessages={latestMessages}
          />
        </div>

        {/* Right Section - Chat Window */}
        <div className="flex-1 flex flex-col min-w-0">
          {selectedChat ? (
            <>
              <ChatWindow
                chat={selectedChat}
                currentUser={user}
                onChatSelect={setSelectedChat}
                onNewMessage={(message) =>
                  updateLatestMessage(selectedChat.id, message)
                }
              />
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-500 bg-[#f0f2f5]">
              <div className="max-w-md text-center">
                <h3 className="text-2xl font-light text-gray-600 mb-3">
                  Welcome to Periskope Chat
                </h3>
                <p className="text-sm text-gray-500">
                  Select a chat to start messaging or use the search to find
                  specific conversations.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
