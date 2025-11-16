"use client";

import Profile from "@/components/profile/Profile";
import { NotificationProvider } from "@/context/notification/NotificationContext";
import { useState, useEffect } from "react";
import { socket } from "@/socket";

export default function ProfilePage({ params }: { params: Promise<{ userName: string }> }) {
  const [userName, setUserName] = useState<string>("");
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    params.then(({ userName }) => {
      setUserName(userName);
      setIsLoading(false);
    });
  }, [params]);

  useEffect(() => {
    // Check if socket is connected
    if (socket?.connected) {
      setIsConnected(true);
    }

    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    socket?.on('connect', handleConnect);
    socket?.on('disconnect', handleDisconnect);

    return () => {
      socket?.off('connect', handleConnect);
      socket?.off('disconnect', handleDisconnect);
    };
  }, []);

  if (isLoading) {
    return null;
  }

  return (
    <NotificationProvider isSocketConnected={isConnected}>
      <Profile userName={userName} />
    </NotificationProvider>
  );
}


