"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import ChatList from "@/components/chat/ChatList";
import ChatWindow from "@/components/chat/ChatWindow";
import ChatHeader from "@/components/chat/ChatHeader";
import { useRouter } from "next/navigation";
import { IoRefreshOutline, IoHelpCircleOutline } from "react-icons/io5";
import { BsBell, BsThreeDots } from "react-icons/bs";
import { FaMobileAlt } from "react-icons/fa";

export default function ChatsPage() {
  const router = useRouter();
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <main className="flex h-screen bg-[#f0f2f5]">
      {/* Top Toolbar */}
      <div className="fixed top-0 left-0 right-0 h-14 bg-[#f0f2f5] border-b border-gray-200 flex items-center justify-between px-4 z-50">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <img src="/logo.png" alt="Logo" className="h-8 w-8" />
            <div className="flex items-center space-x-1">
              <span className="text-gray-600">chats</span>
              <span className="text-sm text-gray-500">(12)</span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <button className="p-2 hover:bg-gray-200 rounded-full">
            <IoRefreshOutline className="w-5 h-5 text-gray-600" />
          </button>
          <button className="p-2 hover:bg-gray-200 rounded-full">
            <IoHelpCircleOutline className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex items-center space-x-2 px-3 py-1.5 bg-white rounded-lg">
            <FaMobileAlt className="w-4 h-4 text-gray-600" />
            <span className="text-sm text-gray-600">5/6 phones</span>
          </div>
          <button className="p-2 hover:bg-gray-200 rounded-full">
            <BsBell className="w-5 h-5 text-gray-600" />
          </button>
          <button className="p-2 hover:bg-gray-200 rounded-full">
            <BsThreeDots className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Main Content - Adjusted for top toolbar */}
      <div className="flex w-full mt-14">
        {/* Left Section - Chat List */}
        <div className="flex w-[420px] min-w-[420px] bg-white border-r border-gray-200">
          <ChatList
            selectedChat={selectedChat}
            onChatSelect={setSelectedChat}
            currentUser={user}
          />
        </div>

        {/* Right Section - Chat Window */}
        <div className="flex-1 flex flex-col">
          {selectedChat ? (
            <>
              <ChatHeader chat={selectedChat} />
              <ChatWindow chat={selectedChat} currentUser={user} />
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
