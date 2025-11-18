"use client";

import { useState, useEffect } from 'react';
import Feed from '@/components/post/Feed';
import LandingPage from '@/components/layout/LandingPage';
import { useUser } from '@/context/user/UserContext';
import { NotificationProvider } from '@/context/notification/NotificationContext';
import { SocketProvider, useSocket } from '@/components/providers/SocketProvider';

function FeedWithSocket() {
    const { isConnected } = useSocket();

    return <Feed isConnected={isConnected} />;
}

export default function HomeClient() {
    const { getToken } = useUser();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Check authentication
    useEffect(() => {
        const token = getToken();
        setIsAuthenticated(!!token);
        setIsLoading(false);
    }, [getToken]);

    // Handle scroll restoration globally
    useEffect(() => {
        if (typeof window === 'undefined') return;

        // Disable browser's automatic scroll restoration
        if ('scrollRestoration' in window.history) {
            window.history.scrollRestoration = 'manual';
        }

        // Force scroll to top on mount
        window.scrollTo(0, 0);

        // Cleanup: restore scroll restoration on unmount
        return () => {
            if ('scrollRestoration' in window.history) {
                window.history.scrollRestoration = 'auto';
            }
        };
    }, []);

    // Show loading state briefly
    if (isLoading) {
        return null;
    }

    // If authenticated, show the feed with socket and notifications
    if (isAuthenticated) {
        return (
            <SocketProvider>
                <NotificationProvider>
                    <FeedWithSocket />
                </NotificationProvider>
            </SocketProvider>
        );
    }

    // Otherwise show landing page
    return <LandingPage />;
}

