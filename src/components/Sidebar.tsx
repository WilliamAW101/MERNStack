"use client"

import React from 'react';
import {
    Box,
    Typography,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
} from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import SearchIcon from '@mui/icons-material/Search';
import NotificationsIcon from '@mui/icons-material/Notifications';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import { useRouter, usePathname } from 'next/navigation';

export default function Sidebar() {
    const router = useRouter();
    const pathname = usePathname();

    const navigationItems = [
        { text: 'Home', icon: <HomeIcon />, path: '/' },
        { text: 'Search', icon: <SearchIcon />, path: '/search' },
        { text: 'Notifications', icon: <NotificationsIcon />, path: '/notifications' },
        { text: 'Create', icon: <AddCircleOutlineIcon />, path: '/create' },
        { text: 'Profile', icon: <AccountCircleIcon />, path: '/profile' },
    ];

    const handleNavigation = (path: string) => {
        router.push(path);
    };

    return (
        <Box
            sx={{
                display: { xs: 'none', md: 'flex' },
                flexDirection: 'column',
                width: 245,
                position: 'fixed',
                height: '100vh',
                borderRight: '1px solid #dbdbdb',
                bgcolor: '#fff',
                pt: 4,
                pb: 3,
                px: 2,
                zIndex: 1000,
            }}
        >
            {/* Logo */}
            <Box sx={{ px: 2, mb: 4 }}>
                <Typography
                    variant="h5"
                    sx={{
                        fontFamily: 'cursive',
                        fontWeight: 700,
                        color: '#000',
                        fontSize: '1.75rem',
                        cursor: 'pointer',
                    }}
                    onClick={() => router.push('/')}
                >
                    CragTag
                </Typography>
            </Box>

            {/* Navigation List */}
            <List sx={{ flex: 1 }}>
                {navigationItems.map((item, index) => {
                    const isActive = pathname === item.path;
                    return (
                        <ListItem key={index} disablePadding sx={{ mb: 0.5 }}>
                            <ListItemButton
                                onClick={() => handleNavigation(item.path)}
                                sx={{
                                    borderRadius: 2,
                                    py: 1.5,
                                    px: 2,
                                    '&:hover': {
                                        bgcolor: 'rgba(0,0,0,0.05)',
                                    },
                                }}
                            >
                                <ListItemIcon
                                    sx={{
                                        minWidth: 40,
                                        color: isActive ? '#000' : '#262626',
                                    }}
                                >
                                    {item.icon}
                                </ListItemIcon>
                                <ListItemText
                                    primary={item.text}
                                    primaryTypographyProps={{
                                        fontSize: '1rem',
                                        fontWeight: isActive ? 600 : 400,
                                        color: isActive ? '#000' : '#262626',
                                    }}
                                />
                            </ListItemButton>
                        </ListItem>
                    );
                })}
            </List>
        </Box>
    );
}

