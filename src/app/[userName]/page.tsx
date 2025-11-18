"use client";

import Profile from "@/components/profile/Profile";
import { NotificationProvider } from "@/context/notification/NotificationContext";
import { SocketProvider } from "@/components/providers/SocketProvider";
import { useState, useEffect } from "react";

export default function ProfilePage({ params }: { params: Promise<{ userName: string }> }) {
  const [userName, setUserName] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    params.then(({ userName }) => {
      setUserName(userName);
      setIsLoading(false);
    });
  }, [params]);

  if (isLoading) {
    return null;
  }

  return (
    <SocketProvider>
      <NotificationProvider>
        <Profile userName={userName} />
      </NotificationProvider>
    </SocketProvider>
  );
}


