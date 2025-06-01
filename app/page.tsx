"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      // Check if user is logged in
      const user = localStorage.getItem("user");
      
      // If no user is found, redirect to login
      if (!user) {
        router.replace("/login");
      } else {
        // If user is found, redirect to chats
        router.replace("/chats");
      }
    } catch (error) {
      // If localStorage is not available, redirect to login
      router.replace("/login");
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  // Show a loading state while checking auth
  if (!isLoading) {
    return null;
  }

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
    </div>
  );
}
