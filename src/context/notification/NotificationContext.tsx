"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { socket } from '@/socket';
import { useUser } from '../user/UserContext';

export interface Notification {
    _id: string;
    type: 'like' | 'comment';
    message: string;
    fromUserId: string;
    fromUserName: string;
    fromUserAvatar?: string;
    postId?: string;
    commentId?: string;
    timestamp: string;
    read: boolean;
}

interface NotificationContextType {
    notifications: Notification[];
    unreadCount: number;
    addNotification: (notification: Notification) => void;
    markAsRead: (notificationId: string) => void;
    markAllAsRead: () => void;
    clearNotifications: () => void;
    isConnected: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({
    children,
    isSocketConnected
}: {
    children: ReactNode;
    isSocketConnected: boolean;
}) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isConnected, setIsConnected] = useState(isSocketConnected);

    const { user } = useUser();
    const userId = user?.id;

    // Update connection status when prop changes
    useEffect(() => {
        setIsConnected(isSocketConnected);
    }, [isSocketConnected]);

    // Calculate unread count
    const unreadCount = notifications.filter(n => !n.read).length;

    // Listen for socket notifications
    useEffect(() => {
        if (isConnected && socket) {

            const handleLikeNotification = (data: any) => {
                console.log('👍 Like notification received:', data);

                const notification: Notification = {
                    _id: data._id || `like-${Date.now()}`,
                    type: 'like',
                    message: `${data.fromUserName} liked your post`,
                    fromUserId: data.fromUserId,
                    fromUserName: data.fromUserName,
                    fromUserAvatar: data.fromUserAvatar,
                    postId: data.postId,
                    timestamp: data.timestamp || new Date().toISOString(),
                    read: false,
                };
                addNotification(notification);
            };

            const handleCommentNotification = (data: any) => {
                const notification: Notification = {
                    _id: data._id || `comment-${Date.now()}`,
                    type: 'comment',
                    message: `${data.fromUserName} commented on your post`,
                    fromUserId: data.fromUserId,
                    fromUserName: data.fromUserName,
                    fromUserAvatar: data.fromUserAvatar,
                    postId: data.postId,
                    commentId: data.commentId,
                    timestamp: data.timestamp || new Date().toISOString(),
                    read: false,
                };
                addNotification(notification);
            };

            const roomToJoin = `user-${userId}`
            socket.emit('joinRoom', roomToJoin);

            // Register socket event listeners
            socket.on('notification', handleLikeNotification);
            socket.on('notification', handleCommentNotification);

            // Cleanup
            return () => {
                socket?.off('notification:like', handleLikeNotification);
                socket?.off('notification:comment', handleCommentNotification);
            };
        }
    }, [isConnected]);

    const addNotification = (notification: Notification) => {
        setNotifications(prev => [notification, ...prev]);
    };

    const markAsRead = (notificationId: string) => {
        setNotifications(prev =>
            prev.map(n => n._id === notificationId ? { ...n, read: true } : n)
        );
    };

    const markAllAsRead = () => {
        setNotifications(prev =>
            prev.map(n => ({ ...n, read: true }))
        );
    };

    const clearNotifications = () => {
        setNotifications([]);
    };

    return (
        <NotificationContext.Provider
            value={{
                notifications,
                unreadCount,
                addNotification,
                markAsRead,
                markAllAsRead,
                clearNotifications,
                isConnected,
            }}
        >
            {children}
        </NotificationContext.Provider>
    );
}

export function useNotifications() {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
}

