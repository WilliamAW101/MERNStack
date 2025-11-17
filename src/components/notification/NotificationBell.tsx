"use client"

import React, { useState, useEffect } from 'react';
import {
    IconButton,
    Badge,
    Drawer,
    Box,
    Typography,
    Avatar,
    Button,
    CircularProgress,
    List,
    ListItem,
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import FavoriteIcon from '@mui/icons-material/Favorite';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import CloseIcon from '@mui/icons-material/Close';
import { fetchNotifications, fetchUnseenCount, markNotificationAsRead, markAllNotificationsAsSeen, fetchPostById } from '@/services/api.service';
import CommentModal from '../post/CommentModal';
import { Post } from '@/types/post.types';
import { socket } from '@/socket';
import { useToast } from '@/context/toast';

interface NotificationBellProps {
    onDrawerToggle?: (open: boolean) => void;
}

const NotificationBell = ({ onDrawerToggle }: NotificationBellProps) => {
    const toast = useToast();
    const [open, setOpen] = useState(false);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [unseenCount, setUnseenCount] = useState(0); // Badge count (unseen notifications)

    // CommentModal state
    const [commentModalOpen, setCommentModalOpen] = useState(false);
    const [selectedPost, setSelectedPost] = useState<Post | null>(null);
    const [loadingPost, setLoadingPost] = useState(false);

    const handleClick = async () => {
        if (!open) {
            // Opening bell dropdown
            setOpen(true);
            onDrawerToggle?.(true); // Hide sidebar

            setLoading(true);
            try {
                // 1. Fetch all notifications
                const response = await fetchNotifications(50, 0);
                setNotifications(response.notifications);

                // 2. Mark all as seen (badge disappears)
                if (unseenCount > 0) {
                    await markAllNotificationsAsSeen();

                    // 3. Clear badge
                    setUnseenCount(0);
                }
            } catch (error) {
                console.error('Failed to fetch notifications:', error);
                toast.error('Failed to load notifications');
            } finally {
                setLoading(false);
            }
        } else {
            // Closing bell dropdown
            handleClose();
        }
    };

    const handleClose = () => {
        setOpen(false);
        onDrawerToggle?.(false); // Show sidebar
    };

    // Fetch unseen count on mount
    useEffect(() => {
        const loadUnseenCount = async () => {
            try {
                const count = await fetchUnseenCount();
                setUnseenCount(count);
            } catch (error) {
                console.error('Failed to fetch unseen count:', error);
            }
        };

        loadUnseenCount();
    }, []);

    // Listen for real-time notifications via WebSocket
    useEffect(() => {
        if (!socket) return;

        const handleNewNotification = (notification: any) => {
            // Add new notification to the top of the list (avoid duplicates)
            setNotifications(prev => {
                const exists = prev.some(n => n._id === notification._id);
                if (exists) {
                    return prev;
                }
                return [notification, ...prev];
            });

            // Increment unseen count (new notifications have isSeen: false by default)
            setUnseenCount(prev => prev + 1);

            // Show toast notification
            const notificationType = notification.type?.toLowerCase();
            const icon = notificationType === 'like' ? '❤️' : notificationType === 'comment' ? '💬' : '🔔';
            toast.success(`${icon} ${notification.message || 'New notification'}`);
        };

        // Listen for notification events from backend
        socket.on('notification', handleNewNotification);

        // Cleanup listener on unmount
        return () => {
            if (socket) {
                socket.off('notification', handleNewNotification);
            }
        };
    }, [toast]);

    const handleNotificationClick = async (notification: any) => {
        // Mark notification as read (visual styling only, doesn't affect badge)
        if (!notification.isRead && notification._id) {
            // Update UI immediately for instant feedback
            setNotifications(prev =>
                prev.map(n =>
                    n._id === notification._id
                        ? { ...n, isRead: true }
                        : n
                )
            );

            // Sync with backend
            try {
                await markNotificationAsRead(notification._id);
            } catch (error) {
                console.error('Failed to mark notification as read:', error);
            }
        }

        // Fetch post and open CommentModal
        if (notification.data?.postId) {
            setLoadingPost(true);
            try {
                const post = await fetchPostById(notification.data.postId);
                setSelectedPost(post);
                setCommentModalOpen(true);
            } catch (error) {
                console.error('Failed to fetch post:', error);
                toast.error('Failed to load post');
            } finally {
                setLoadingPost(false);
            }
        }
    };

    const handleCloseCommentModal = () => {
        setCommentModalOpen(false);
        setSelectedPost(null);
    };

    const getNotificationIcon = (type: string) => {
        const lowerType = type?.toLowerCase();
        switch (lowerType) {
            case 'like':
                return <FavoriteIcon sx={{ fontSize: 20, color: '#ed4956' }} />;
            case 'comment':
                return <ChatBubbleOutlineIcon sx={{ fontSize: 20, color: '#0095f6' }} />;
            default:
                return <NotificationsIcon sx={{ fontSize: 20 }} />;
        }
    };

    const formatTimestamp = (timestamp: string) => {
        const now = new Date();
        const notificationDate = new Date(timestamp);
        const diffInSeconds = Math.floor((now.getTime() - notificationDate.getTime()) / 1000);

        if (diffInSeconds < 60) return `${diffInSeconds}s`;
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
        if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;
        return `${Math.floor(diffInSeconds / 604800)}w`;
    };

    return (
        <>
            <IconButton
                onClick={handleClick}
                sx={{
                    color: open ? '#5A7156' : 'inherit',
                    '&:hover': {
                        color: '#5A7156',
                    },
                }}
            >
                <Badge
                    badgeContent={unseenCount}
                    color="error"
                    sx={{
                        '& .MuiBadge-badge': {
                            fontSize: '0.65rem',
                            height: '18px',
                            minWidth: '18px',
                            fontWeight: 600,
                        }
                    }}
                >
                    {unseenCount > 0 ? (
                        <NotificationsIcon sx={{ fontSize: 28 }} />
                    ) : (
                        <NotificationsNoneIcon sx={{ fontSize: 28 }} />
                    )}
                </Badge>
            </IconButton>

            <Drawer
                anchor="left"
                open={open}
                onClose={handleClose}
                PaperProps={{
                    sx: {
                        width: { xs: 200, md: 300, lg: 400 }, // Match sidebar width
                        bgcolor: '#E9EDE8',
                        borderRight: '1px solid #dbdbdb',
                    },
                }}
            >
                {/* Header */}
                <Box sx={{ px: 3, py: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #dbdbdb' }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.2rem', color: '#262626' }}>
                        Notifications
                    </Typography>
                    <IconButton onClick={handleClose} size="small">
                        <CloseIcon />
                    </IconButton>
                </Box>

                {/* Notifications List */}
                <Box sx={{
                    height: 'calc(100vh - 80px)',
                    overflowY: 'auto',
                    '&::-webkit-scrollbar': {
                        width: '8px',
                    },
                    '&::-webkit-scrollbar-track': {
                        bgcolor: 'transparent',
                    },
                    '&::-webkit-scrollbar-thumb': {
                        borderRadius: '4px',
                    },
                }}>
                    {loading && notifications.length === 0 ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                            <CircularProgress sx={{ color: '#5A7156' }} />
                        </Box>
                    ) : notifications.length === 0 ? (
                        <Box sx={{ py: 8, textAlign: 'center' }}>
                            <NotificationsNoneIcon sx={{ fontSize: 64, color: '#8e8e8e', mb: 2 }} />
                            <Typography variant="body2" sx={{ color: '#8e8e8e', fontSize: '1rem' }}>
                                No notifications yet
                            </Typography>
                        </Box>
                    ) : (
                        <List sx={{ p: 0 }}>
                            {notifications.map((notification, index) => (
                                <ListItem
                                    key={notification._id || `notification-${index}-${notification.data?.timestamp}`}
                                    onClick={() => handleNotificationClick(notification)}
                                    sx={{
                                        px: 2,
                                        py: 2,
                                        cursor: 'pointer',
                                        bgcolor: notification.isRead ? 'transparent' : 'rgba(90, 113, 86, 0.08)',
                                        '&:hover': {
                                            bgcolor: notification.isRead ? 'rgba(0, 0, 0, 0.04)' : 'rgba(90, 113, 86, 0.12)',
                                        },
                                        borderBottom: '1px solid #e0e0e0',
                                    }}
                                >
                                    <Box sx={{ display: 'flex', gap: 1.5, width: '100%', alignItems: 'flex-start' }}>

                                        {/* Notification Content */}
                                        <Box sx={{ flex: 1, minWidth: 0 }}>
                                            <Typography
                                                variant="body2"
                                                sx={{
                                                    fontSize: '0.9rem',
                                                    color: '#262626',
                                                    mb: 0.5,
                                                    fontWeight: notification.isRead ? 400 : 600,
                                                    lineHeight: 1.4,
                                                }}
                                            >
                                                {notification.message || 'New notification'}
                                            </Typography>
                                            <Typography
                                                variant="caption"
                                                sx={{ color: '#8e8e8e', fontSize: '0.75rem' }}
                                            >
                                                {formatTimestamp(notification.data?.timestamp || new Date().toISOString())}
                                            </Typography>
                                        </Box>

                                        {/* Notification Icon */}
                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                            {getNotificationIcon(notification.type || 'default')}
                                        </Box>
                                    </Box>
                                </ListItem>
                            ))}
                        </List>
                    )}
                </Box>
            </Drawer>

            {/* Loading Dialog */}
            {loadingPost && (
                <Box
                    sx={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        bgcolor: 'rgba(0, 0, 0, 0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 9999,
                    }}
                >
                    <CircularProgress sx={{ color: '#fff' }} />
                </Box>
            )}

            {/* Comment Modal */}
            {selectedPost && (
                <CommentModal
                    open={commentModalOpen}
                    onClose={handleCloseCommentModal}
                    post={selectedPost}
                />
            )}
        </>
    );
};

export default NotificationBell;

