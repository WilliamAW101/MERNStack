"use client";
import Feed from "@/components/post/Feed";
import LandingPage from "@/components/layout/LandingPage";
import { useUser } from '@/context/user/UserContext';
import { useState, useEffect } from "react";

export default function Home() {
  const { getToken } = useUser();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user has a token
    const token = getToken();
    setIsAuthenticated(!!token);
    setIsLoading(false);
  }, [getToken]);

  // Show loading state briefly
  if (isLoading) {
    return null;
  }

  // If authenticated, show the feed
  if (isAuthenticated) {
    return <Feed />;
  }

  // Otherwise show landing page
  return <LandingPage />;
}
