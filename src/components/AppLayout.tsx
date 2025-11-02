"use client"

import React from 'react';
import {
    Box,
    Paper,
    BottomNavigation,
    BottomNavigationAction,
} from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import NotificationsIcon from '@mui/icons-material/Notifications';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import Sidebar from './Sidebar';

interface AppLayoutProps {
    children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
    const [mobileNavValue, setMobileNavValue] = React.useState(0);

    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
            }}
        >
            {/* Sidebar */}
            <Sidebar />

            {/* Main Content */}
            <Box
                sx={{
                    flex: 1,
                    ml: { xs: 0, md: '245px' },
                    pt: { xs: 8, md: 4 },
                    pb: { xs: 10, md: 4 },
                    minHeight: '100vh',
                }}
            >
                {children}
            </Box>

            {/* Mobile Bottom Navigation */}
            <Paper
                sx={{
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    display: { xs: 'block', md: 'none' },
                    zIndex: 1000,
                    borderTop: '1px solid #dbdbdb',
                }}
                elevation={3}
            >
                <BottomNavigation
                    value={mobileNavValue}
                    onChange={(event, newValue) => {
                        setMobileNavValue(newValue);
                    }}
                    showLabels
                    sx={{
                        height: 70,
                        bgcolor: '#fff',
                        '& .MuiBottomNavigationAction-root': {
                            minWidth: 'auto',
                            padding: '6px 0',
                        },
                        '& .MuiBottomNavigationAction-label': {
                            fontSize: '0.7rem',
                            marginTop: '4px',
                        },
                        '& .Mui-selected': {
                            color: '#2e7d32',
                        },
                    }}
                >
                    <BottomNavigationAction
                        label="Home"
                        icon={<HomeIcon />}
                    />
                    <BottomNavigationAction
                        label="Top"
                        icon={<WhatshotIcon />}
                    />
                    <BottomNavigationAction
                        label=""
                        icon={
                            <AddCircleIcon
                                sx={{
                                    fontSize: 40,
                                    color: '#2e7d32',
                                }}
                            />
                        }
                    />
                    <BottomNavigationAction
                        label="Notifications"
                        icon={<NotificationsIcon />}
                    />
                    <BottomNavigationAction
                        label="Profile"
                        icon={<AccountCircleIcon />}
                    />
                </BottomNavigation>
            </Paper>
        </Box>
    );
}


