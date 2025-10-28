// src/context/UserContext.tsx
"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
    first_name: string;
    last_name: string;
    username?: string;
    email?: string;
    token?: string;
}

interface UserContextType {
    user: User | null;
    setUser: (user: User) => void;
    logout: () => void;
    getToken: () => string | null;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUserState] = useState<User | null>(null);

    // Load user from localStorage on mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const storedUser = localStorage.getItem('user');
            const storedToken = localStorage.getItem('token');

            if (storedUser && storedToken) {
                try {
                    const userData = JSON.parse(storedUser);
                    // Ensure token is up to date
                    setUserState({ ...userData, token: storedToken });
                } catch (error) {
                    console.error('Error parsing stored user data:', error);
                    // Clear corrupted data
                    localStorage.removeItem('user');
                    localStorage.removeItem('token');
                }
            }
        }
    }, []);

    const setUser = (user: User) => {
        setUserState(user);
        if (typeof window !== 'undefined') {
            localStorage.setItem('user', JSON.stringify(user));
        }
    };

    const logout = () => {
        setUserState(null);
        if (typeof window !== 'undefined') {
            localStorage.removeItem('user');
            localStorage.removeItem('token');
        }
    };

    const getToken = () => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('token');
        }
        return null;
    };

    return (
        <UserContext.Provider value={{ user, setUser, logout, getToken }}>
            {children}
        </UserContext.Provider>
    );
};

// Custom hook to use context
export const useUser = () => {
    const context = useContext(UserContext);
    if (!context) throw new Error('useUser must be used within a UserProvider');
    return context;
};
