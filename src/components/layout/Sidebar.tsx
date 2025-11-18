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
                component="nav"
                aria-label="Main navigation"
                sx={{
                    display: notificationDrawerOpen ? 'none' : { xs: 'none', md: 'flex' },
                    flexDirection: 'column',
                    width: { md: 240, lg: 300, xl: 340 },
                    position: 'fixed',
                    height: '100vh',
                    borderRight: '2px solid #d0d7d0',
                    bgcolor: '#f2f4f2',
                    background: 'linear-gradient(180deg, #f5f7f5 0%, #e8ebe8 100%)',
                    pt: { md: 3, lg: 4 },
                    pb: { md: 2, lg: 3 },
                    px: { md: 1.5, lg: 2 },
                    zIndex: 1000,
                    boxShadow: '4px 0 12px rgba(0,0,0,0.05)',
                }}
            >
                {/* Logo - Hiking Theme */}
                <Box sx={{ px: { md: 1, lg: 2 }, mb: { md: 3, lg: 4 }, borderBottom: '2px solid #d0d7d0', pb: 2 }}>
                    <SignatureLogo size="medium" color="#000" />
                </Box>

                {/* Navigation List */}
                <List sx={{ flex: 1, px: 1 }}>
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
                                            py: { md: 1.2, lg: 1.5 },
                                            px: { md: 0.8, lg: 1 },
                                            transition: 'all 0.2s',
                                            '&:hover': {
                                                bgcolor: 'rgba(0,0,0,0.04)',
                                            },
                                        }}
                                    >
                                        <Box
                                            sx={{
                                                minWidth: { md: 32, lg: 40 },
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
                                                fontSize: { md: '0.875rem', lg: '1rem' },
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
                                    aria-label={item.text}
                                    aria-current={isActive ? 'page' : undefined}
                                    sx={{
                                        borderRadius: 2,
                                        py: { md: 1.2, lg: 1.5 },
                                        px: { md: 1.5, lg: 2 },
                                        transition: 'all 0.2s',
                                        bgcolor: 'transparent',
                                        '&:hover': {
                                            bgcolor: 'rgba(0,0,0,0.04)',
                                        },

                                    }}
                                >
                                    <ListItemIcon
                                        sx={{
                                            minWidth: { md: 32, lg: 40 },
                                            color: isActive ? '#2e7d32' : '#424242', // Green when active, dark gray otherwise
                                        }}
                                    >
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                '& > svg': {
                                                    fontSize: { md: '1.5rem !important', lg: '1.75rem !important' },
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
                                            fontSize: { md: '0.875rem', lg: '1rem' },
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
                        aria-label="Sign out of your account"
                        sx={{
                            borderRadius: 2,
                            py: { md: 1.2, lg: 1.5 },
                            px: { md: 1.5, lg: 2 },
                            mb: 1,
                            transition: 'all 0.2s',
                            bgcolor: 'rgba(255, 107, 53, 0.08)',
                            border: '1px solid rgba(255, 107, 53, 0.2)',
                            '&:hover': {
                                bgcolor: '#ff6b35',
                                color: '#fff',
                                '& .MuiListItemIcon-root': {
                                    color: '#fff !important',
                                },
                                '& .MuiTypography-root': {
                                    color: '#fff !important',
                                },
                            },
                        }}
                    >
                        <ListItemIcon
                            sx={{
                                minWidth: { md: 32, lg: 40 },
                                color: '#ff6b35',
                            }}
                        >
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    '& > svg': {
                                        fontSize: { md: '1.5rem !important', lg: '1.75rem !important' },
                                    },
                                }}
                            >
                                <LogoutIcon />
                            </Box>
                        </ListItemIcon>
                        <ListItemText
                            primary="Sign Out"
                            primaryTypographyProps={{
                                fontSize: { md: '0.875rem', lg: '1rem' },
                                fontWeight: 600,
                                color: '#ff6b35',
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

