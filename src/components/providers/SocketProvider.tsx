"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useUser } from '@/context/user/UserContext';
import { socket } from '@/socket';

interface SocketContextType {
    isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({ isConnected: false });

export const useSocket = () => useContext(SocketContext);

export function SocketProvider({ children }: { children: ReactNode }) {
    const { user } = useUser();
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        if (!user?.id || !socket) return;

        const onConnect = () => {
            setIsConnected(true);
            socket.emit('register', user.id);
        };

        const onDisconnect = () => {
            setIsConnected(false);
        };

        const onError = (error: any) => {
            console.error('Socket error:', error);
            setIsConnected(false);
        };

        // Register listeners
        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        socket.on('connect_error', onError);
        socket.on('error', onError);

        // Connect
        socket.connect();

        // Cleanup
        return () => {
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
            socket.off('connect_error', onError);
            socket.off('error', onError);
            if (socket.connected) {
                socket.disconnect();
            }
        };
    }, [user?.id]);

    return (
        <SocketContext.Provider value={{ isConnected }}>
            {children}
        </SocketContext.Provider>
    );
}

