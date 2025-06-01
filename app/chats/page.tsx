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

export default function ChatsPage() {
  const router = useRouter();
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [latestMessages, setLatestMessages] = useState<{[key: string]: any}>({});

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

  // Function to update latest message for a chat
  const updateLatestMessage = (chatId: string, message: any) => {
    setLatestMessages(prev => ({
      ...prev,
      [chatId]: message
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
      <div className="fixed top-0 left-0 right-0 h-14 bg-[#f0f2f5] border-b border-gray-200 flex items-center justify-between px-4 z-50">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 px-3 py-1.5 bg-white rounded-lg">
            <img src="/logo.png" alt="Logo" className="h-8 w-8" />
            <div className="flex items-center space-x-1">
              <span className="text-gray-600 font-medium">chats</span>
              <span className="text-sm text-gray-500">(12)</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 px-3 py-1.5 bg-white rounded-lg">
              <LuRefreshCcwDot className="w-5 h-5 text-gray-600" />
              <span className="text-sm text-gray-600">Refresh</span>
            </div>
            <div className="flex items-center space-x-2 px-3 py-1.5 bg-white rounded-lg">
            <IoHelpCircleOutline className="w-5 h-5 text-gray-600" />
              <span className="text-sm text-gray-600">Help</span>
            </div>
          </div>

          <div className="flex items-center space-x-2 px-3 py-1.5 bg-white rounded-lg">
            <FaMobileAlt className="w-4 h-4 text-gray-600" />
            <span className="text-sm text-gray-600">5/6 phones</span>
          </div>

          <div className="flex items-center space-x-2 px-3 py-1.5 bg-white rounded-lg">
            <MdInstallDesktop className="w-5 h-5 text-gray-600" />
          </div>

          <div className="flex items-center space-x-2 px-3 py-1.5 bg-white rounded-lg">
            <MdNotificationsOff className="w-5 h-5 text-gray-600" />
          </div>

          <div className="flex items-center space-x-2 px-3 py-1.5 bg-white rounded-lg">
            <IoSparklesSharp className="w-5 h-5 text-yellow-400" />
            <BsListTask className="w-5 h-5 text-gray-600" />
          </div>
        </div>
      </div>

      {/* Main Content - Adjusted for top toolbar */}
      <div className="flex w-full mt-14 overflow-hidden">
        {/* Left Section - Chat List */}
        <div className="flex bg-white border-r border-gray-200 flex-shrink-0">
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
                onNewMessage={(message) => updateLatestMessage(selectedChat.id, message)}
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
