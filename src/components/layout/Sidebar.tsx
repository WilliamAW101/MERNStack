"use client"

import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Avatar,
} from '@mui/material';
// Hiking-themed icons (revert to: Home, Search, Notifications, AddCircle if needed)
import TerrainIcon from '@mui/icons-material/Terrain';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LogoutIcon from '@mui/icons-material/Logout';
import { useRouter, usePathname } from 'next/navigation';
import CreatePostModal from '../post/CreatePostModal';
import SignatureLogo from '../common/SignatureLogo';
import NotificationBell from '../notification/NotificationBell';

export default function Sidebar() {
    const router = useRouter();
    const pathname = usePathname();
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [userName, setUserName] = useState<string | null>(null);
    const [notificationDrawerOpen, setNotificationDrawerOpen] = useState(false);

    // Load username from localStorage only on client side
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const user = localStorage.getItem('user');
            if (user) {
                try {
                    const parsedUser = JSON.parse(user);
                    setUserName(parsedUser.userName);
                } catch (error) {
                    console.error('Error parsing user from localStorage:', error);
                }
            }
        }
    }, []);

    const navigationItems = [
        { text: 'Discover', icon: <TerrainIcon />, path: '/', action: 'navigate-refresh' },
        { text: 'Notifications', icon: null, path: '/notifications', action: 'notification' },
        { text: 'Log My Hike', icon: <CameraAltIcon />, path: '/create', action: 'modal' },
        { text: 'Profile', icon: <AccountCircleIcon />, path: `/${userName}`, action: 'navigate' },
    ];

    const handleNavigation = (path: string, action: string) => {
        if (action === 'modal') {
            setCreateModalOpen(true);
        } else if (action === 'navigate-refresh') {
            // Navigate and force refresh to reload feed
            if (pathname === path) {
                // Already on the page, just refresh
                router.refresh();
                window.location.reload();
            } else {
                // Navigate then reload
                router.push(path);
                setTimeout(() => {
                    window.location.reload();
                }, 100);
            }
        } else {
            router.push(path);
        }
    };

    const handlePostCreated = () => {
        router.refresh();
    };

    const handleSignOut = () => {
        // Clear token and user from localStorage
        if (typeof window !== 'undefined') {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        }
        router.refresh();
    };

    return (
        <>
            <Box
                sx={{
                    display: notificationDrawerOpen ? 'none' : { xs: 'none', md: 'flex' },
                    flexDirection: 'column',
                    width: { xs: 200, md: 300, lg: 400 },
                    position: 'fixed',
                    height: '100vh',
                    borderRight: '1px solid #dbdbdb',
                    bgcolor: '#E9EDE8',
                    pt: 4,
                    pb: 3,
                    px: 2,
                    zIndex: 1000,
                }}
            >
                {/* Logo - Hiking Theme */}
                <Box sx={{ px: 2, mb: 3 }}>
                    <SignatureLogo size="medium" color="#000" />
                </Box>

                {/* Navigation List */}
                <List sx={{ flex: 1 }}>
                    {navigationItems.map((item, index) => {
                        const isActive = pathname === item.path && item.action === 'navigate';

                        // Special rendering for Notifications
                        if (item.action === 'notification') {
                            return (
                                <ListItem key={index} disablePadding sx={{ mb: 0.5 }}>
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            width: '100%',
                                            borderRadius: 2,
                                            py: 1.5,
                                            px: 1,
                                            transition: 'all 0.2s',
                                            '&:hover': {
                                                bgcolor: 'rgba(0,0,0,0.04)',
                                            },
                                        }}
                                    >
                                        <Box
                                            sx={{
                                                minWidth: 40,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }}
                                        >
                                            <NotificationBell
                                                onDrawerToggle={setNotificationDrawerOpen}
                                            />
                                        </Box>
                                        <ListItemText
                                            primary={item.text}
                                            primaryTypographyProps={{
                                                fontSize: { md: '1rem', lg: '1.05rem' },
                                                fontWeight: 400,
                                                color: '#424242',
                                            }}
                                        />
                                    </Box>
                                </ListItem>
                            );
                        }

                        return (
                            <ListItem key={index} disablePadding sx={{ mb: 0.5 }}>
                                <ListItemButton
                                    onClick={() => handleNavigation(item.path, item.action)}
                                    sx={{
                                        borderRadius: 2,
                                        py: 1.5,
                                        px: 2,
                                        transition: 'all 0.2s',
                                        bgcolor: 'transparent',
                                        '&:hover': {
                                            bgcolor: 'rgba(0,0,0,0.04)',
                                        },

                                    }}
                                >
                                    <ListItemIcon
                                        sx={{
                                            minWidth: 40,
                                            color: isActive ? '#2e7d32' : '#424242', // Green when active, dark gray otherwise
                                        }}
                                    >
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                '& > svg': {
                                                    fontSize: { md: '1.75rem !important', lg: '1.85rem !important' },
                                                    fontWeight: isActive ? 700 : 400,
                                                },
                                            }}
                                        >
                                            {item.icon}
                                        </Box>
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={item.text}
                                        primaryTypographyProps={{
                                            fontSize: { md: '1rem', lg: '1.05rem' },
                                            fontWeight: isActive ? 600 : 400,
                                            color: isActive ? '#2e7d32' : '#424242', // Green when active
                                        }}
                                    />
                                </ListItemButton>
                            </ListItem>
                        );
                    })}
                </List>

                {/* Sign Out Button at bottom */}
                <Box sx={{ mt: 'auto', pt: 2 }}>
                    <ListItemButton
                        onClick={handleSignOut}
                        sx={{
                            borderRadius: 2,
                            py: 1.5,
                            px: 2,
                            transition: 'all 0.2s',
                            bgcolor: 'transparent',
                            '&:hover': {
                                bgcolor: 'rgba(0,0,0,0.04)',
                            },
                        }}
                    >
                        <ListItemIcon
                            sx={{
                                minWidth: 40,
                                color: 'black',
                            }}
                        >
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    '& > svg': {
                                        fontSize: { md: '1.75rem !important', lg: '1.85rem !important' },
                                    },
                                }}
                            >
                                <LogoutIcon />
                            </Box>
                        </ListItemIcon>
                        <ListItemText
                            primary="Sign Out"
                            primaryTypographyProps={{
                                fontSize: { md: '1rem', lg: '1.05rem' },
                                fontWeight: 400,
                                color: 'black',
                            }}
                        />
                    </ListItemButton>
                </Box>

            </Box>

            {/* Create Post Modal - Rendered outside Sidebar Box to avoid hydration errors */}
            <CreatePostModal
                open={createModalOpen}
                onClose={() => setCreateModalOpen(false)}
                onPostCreated={handlePostCreated}
            />
        </>
    );
}

