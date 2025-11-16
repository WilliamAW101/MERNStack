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
import { grabNotifications, markNotificationAsRead, markAllNotificationsAsSeen, fetchPostById } from '@/services/api.service';
import CommentModal from '../post/CommentModal';
import { Post } from '@/types/post.types';
import { socket } from '@/socket';
import { useToast } from '@/context/toast';

const NotificationBell = () => {
    const toast = useToast();
    const [open, setOpen] = useState(false);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(true);
    const [unseenCount, setUnseenCount] = useState(0); // Badge count (unseen notifications)

    // CommentModal state
    const [commentModalOpen, setCommentModalOpen] = useState(false);
    const [selectedPost, setSelectedPost] = useState<Post | null>(null);
    const [loadingPost, setLoadingPost] = useState(false);

    const handleClick = async () => {
        setOpen(true);

        // Mark all notifications as seen when bell is clicked
        if (unseenCount > 0) {
            // Update UI immediately (optimistic)
            setUnseenCount(0);
            setNotifications(prev => prev.map(n => ({ ...n, seen: true })));

            // Sync with backend
            try {
                await markAllNotificationsAsSeen();
                console.log('✅ All notifications marked as seen');
            } catch (error) {
                console.error('Failed to mark notifications as seen:', error);
            }
        }
    };

    const handleClose = () => {
        setOpen(false);
    };

    // Always reload notifications when drawer opens (fresh data)
    useEffect(() => {
        if (open) {
            loadNotifications();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    // Listen for real-time notifications via WebSocket
    useEffect(() => {
        if (!socket) return;

        const handleNewNotification = (notification: any) => {
            console.log('📬 Received new notification:', notification);

            // Add new notification to the top of the list (avoid duplicates)
            setNotifications(prev => {
                // Check if notification already exists
                const exists = prev.some(n => n._id === notification._id);
                if (exists) {
                    console.log('Notification already exists, skipping');
                    return prev;
                }
                return [notification, ...prev];
            });

            // Increment unseen count (new notifications are unseen by default)
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

    const loadNotifications = async (cursor?: string) => {
        if (loading) return;

        setLoading(true);
        try {
            const response = await grabNotifications(cursor);

            if (cursor) {
                // Append to existing notifications (infinite scroll)
                setNotifications(prev => [...prev, ...response.personalNotifications]);
            } else {
                // Initial load - set fresh notifications
                setNotifications(response.personalNotifications);

                // Calculate unseen count (notifications that haven't been "seen" yet)
                // Assuming backend returns 'seen' field or we use 'read' for now
                const unseenNotifications = response.personalNotifications.filter((n: any) => !n.seen && !n.read);
                setUnseenCount(unseenNotifications.length);

                console.log('📊 Loaded notifications:', response.personalNotifications.length);
                console.log('👁️ Unseen count:', unseenNotifications.length);
            }

            setNextCursor(response.nextCursor);
            setHasMore(!!response.nextCursor);
        } catch (error) {
            console.error('Failed to load notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLoadMore = () => {
        if (nextCursor && hasMore) {
            loadNotifications(nextCursor);
        }
    };

    const handleNotificationClick = async (notification: any) => {
        console.log('🔔 Clicking notification:', notification);

        // Mark notification as read (visual styling only, doesn't affect badge)
        if (!notification.read && notification._id) {
            // Update UI immediately for instant feedback
            setNotifications(prev =>
                prev.map(n =>
                    n._id === notification._id
                        ? { ...n, read: true }
                        : n
                )
            );

            // Sync with backend (optional, for persistence)
            try {
                await markNotificationAsRead(notification._id);
                console.log('✅ Notification marked as read');
            } catch (error: any) {
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
                anchor="right"
                open={open}
                onClose={handleClose}
                PaperProps={{
                    sx: {
                        width: { xs: 200, md: 300, lg: 400 }, // Match sidebar width
                        bgcolor: '#E9EDE8',
                        borderLeft: '1px solid #dbdbdb',
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
                                        bgcolor: notification.read ? 'transparent' : 'rgba(90, 113, 86, 0.08)',
                                        '&:hover': {
                                            bgcolor: notification.read ? 'rgba(0, 0, 0, 0.04)' : 'rgba(90, 113, 86, 0.12)',
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
                                                    fontWeight: notification.read ? 400 : 600,
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

                            {/* Load More Button */}
                            {hasMore && (
                                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                                    <Button
                                        onClick={handleLoadMore}
                                        disabled={loading}
                                        sx={{
                                            textTransform: 'none',
                                            color: '#5A7156',
                                            fontWeight: 600,
                                        }}
                                    >
                                        {loading ? <CircularProgress size={20} sx={{ color: '#5A7156' }} /> : 'Load More'}
                                    </Button>
                                </Box>
                            )}
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

