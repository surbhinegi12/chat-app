"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in
    const user = localStorage.getItem("user");
    
    // If no user is found, redirect to login
    if (!user) {
      router.replace("/login");
    } else {
      // If user is found, redirect to chats
      router.replace("/chats");
    }
  }, [router]);

  // Show a loading state while checking auth
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
    </div>
  );
}
