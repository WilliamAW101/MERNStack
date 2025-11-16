"use client";
import Feed from "@/components/post/Feed";
import LandingPage from "@/components/layout/LandingPage";
import { useUser } from '@/context/user/UserContext';
import { NotificationProvider } from '@/context/notification/NotificationContext';
import { useState, useEffect } from "react";
import { socket } from '@/socket';


export default function Home() {
  const { getToken } = useUser();
  const { user } = useUser();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Check if user has a token
    const token = getToken();
    setIsAuthenticated(!!token);
    setIsLoading(false);
  }, [getToken]);

  useEffect(() => {
    // Connect socket when authenticated
    if (isAuthenticated && socket) {

      const onConnect = () => {
        console.log('✅ Socket connected successfully');
        setIsConnected(true);

        // Register user with socket server AFTER connection is established
        if (socket && user?.id) {
          console.log(`Registering user ${user.id} to join room...`);
          socket.emit('register', user.id);
        }
      };

      const onDisconnect = (reason: string) => {
        setIsConnected(false);
      };

      const onError = (error: any) => {
        console.error('Socket connection error:', {
          message: error.message,
          description: error.description,
          type: error.type,
          context: error.context,
        });


        setIsConnected(false);
      };

      const onConnectError = (error: any) => {
        console.error('Connect error:', error);
      };

      const onReconnectAttempt = (attemptNumber: number) => {
        console.log(`Reconnection attempt #${attemptNumber}...`);
      };

      const onReconnectFailed = () => {
        console.error('Failed to reconnect after maximum attempts');
      };

      const onRegistered = (response: { success: boolean; message: string }) => {
        console.log('✅ Registration confirmed:', response.message);
      };

      // Register event listeners BEFORE connecting
      socket.on('connect', onConnect);
      socket.on('disconnect', onDisconnect);
      socket.on('connect_error', onError);
      socket.on('error', onConnectError);
      socket.on('registered', onRegistered);
      socket.io.on('reconnect_attempt', onReconnectAttempt);
      socket.io.on('reconnect_failed', onReconnectFailed);

      // Connect to socket server
      console.log('🔌 Connecting to socket server...');
      socket.connect();

      // Cleanup function
      return () => {
        console.log('🧹 Cleaning up socket listeners...');
        socket?.off('connect', onConnect);
        socket?.off('disconnect', onDisconnect);
        socket?.off('connect_error', onError);
        socket?.off('error', onConnectError);
        socket?.off('registered', onRegistered);
        socket?.io?.off('reconnect_attempt', onReconnectAttempt);
        socket?.io?.off('reconnect_failed', onReconnectFailed);
        if (socket?.connected) {
          console.log('Disconnecting socket...');
          socket.disconnect();
        }
      };
    } else if (isAuthenticated && !socket) {
      console.log('Socket server URL not configured (NEXT_PUBLIC_SOCKET_URL). Socket features disabled.');
    }
  }, [isAuthenticated, user?.id]);

  // Show loading state briefly
  if (isLoading) {
    return null;
  }

  // If authenticated, show the feed
  if (isAuthenticated) {
    return (
      <NotificationProvider isSocketConnected={isConnected}>
        <Feed
          isConnected={isConnected}
          setIsConnected={setIsConnected}
        />
      </NotificationProvider>
    );
  }

  // Otherwise show landing page
  return <LandingPage />;
}
