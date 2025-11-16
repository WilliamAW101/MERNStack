"use client"

import React, { useState } from 'react';
import {
    IconButton,
    Badge,
    Menu,
    MenuItem,
    Box,
    Typography,
    Avatar,
    Divider,
    Button,
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import FavoriteIcon from '@mui/icons-material/Favorite';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { useNotifications } from '@/context/notification/NotificationContext';
import { useRouter } from 'next/navigation';

const NotificationBell = () => {
    const router = useRouter();
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);

    const handleClick = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleNotificationClick = (notification: any) => {
        markAsRead(notification._id);
        handleClose();

        // Navigate to the relevant post or profile
        if (notification.postId) {
            // Navigate to post (you can create a post detail page)
            console.log('Navigate to post:', notification.postId);
        } else if (notification.type === 'follow') {
            // Navigate to user's profile
            router.push(`/profile/${notification.fromUserName}`);
        }
    };

    const handleMarkAllAsRead = () => {
        markAllAsRead();
    };

    const getNotificationIcon = (type: string) => {
        switch (type) {
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
                    badgeContent={unreadCount}
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
                    {unreadCount > 0 ? (
                        <NotificationsIcon sx={{ fontSize: 28 }} />
                    ) : (
                        <NotificationsNoneIcon sx={{ fontSize: 28 }} />
                    )}
                </Badge>
            </IconButton>

            <Menu
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
                PaperProps={{
                    sx: {
                        width: 400,
                        maxHeight: 500,
                        mt: 1,
                        overflow: 'hidden',
                        borderRadius: 2,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    },
                }}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
                {/* Header */}
                <Box sx={{ px: 2, py: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1rem' }}>
                        Notifications
                    </Typography>
                    {unreadCount > 0 && (
                        <Button
                            size="small"
                            onClick={handleMarkAllAsRead}
                            sx={{
                                textTransform: 'none',
                                fontSize: '0.75rem',
                                color: '#0095f6',
                                '&:hover': {
                                    bgcolor: 'transparent',
                                    textDecoration: 'underline',
                                },
                            }}
                        >
                            Mark all as read
                        </Button>
                    )}
                </Box>

                <Divider />

                {/* Notifications List */}
                <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
                    {notifications.length === 0 ? (
                        <Box sx={{ py: 4, textAlign: 'center' }}>
                            <NotificationsNoneIcon sx={{ fontSize: 48, color: '#8e8e8e', mb: 1 }} />
                            <Typography variant="body2" sx={{ color: '#8e8e8e' }}>
                                No notifications yet
                            </Typography>
                        </Box>
                    ) : (
                        notifications.map((notification) => (
                            <MenuItem
                                key={notification._id}
                                onClick={() => handleNotificationClick(notification)}
                                sx={{
                                    px: 2,
                                    py: 1.5,
                                    bgcolor: notification.read ? 'transparent' : 'rgba(90, 113, 86, 0.05)',
                                    '&:hover': {
                                        bgcolor: notification.read ? 'rgba(0, 0, 0, 0.04)' : 'rgba(90, 113, 86, 0.1)',
                                    },
                                    borderLeft: notification.read ? 'none' : '3px solid #5A7156',
                                }}
                            >
                                <Box sx={{ display: 'flex', gap: 1.5, width: '100%', alignItems: 'flex-start' }}>
                                    {/* User Avatar */}
                                    <Avatar
                                        src={notification.fromUserAvatar}
                                        sx={{ width: 40, height: 40 }}
                                    >
                                        {notification.fromUserName?.charAt(0).toUpperCase()}
                                    </Avatar>

                                    {/* Notification Content */}
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Typography
                                            variant="body2"
                                            sx={{
                                                fontSize: '0.875rem',
                                                color: '#000',
                                                mb: 0.5,
                                                fontWeight: notification.read ? 400 : 600,
                                            }}
                                        >
                                            {notification.message}
                                        </Typography>
                                        <Typography
                                            variant="caption"
                                            sx={{ color: '#8e8e8e', fontSize: '0.75rem' }}
                                        >
                                            {formatTimestamp(notification.timestamp)}
                                        </Typography>
                                    </Box>

                                    {/* Notification Icon */}
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                        {getNotificationIcon(notification.type)}
                                    </Box>
                                </Box>
                            </MenuItem>
                        ))
                    )}
                </Box>
            </Menu>
        </>
    );
};

export default NotificationBell;

