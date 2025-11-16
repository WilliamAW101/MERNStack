import { io } from 'socket.io-client';

// Socket server URL - use environment variable (no fallback to prevent unwanted connections)
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || '';

// Create socket instance with autoConnect: false
// We'll manually connect when user is authenticated
export const socket = SOCKET_URL ? io(SOCKET_URL, {
    autoConnect: false,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 3, // Reduced from 5 to fail faster
    timeout: 10000, // 10 second timeout
}) : null;