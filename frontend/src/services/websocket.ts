import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;
const registeredListeners = new Set<Function>();

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

export const initializeWebSocket = (): Socket => {
    if (socket && socket.connected) {
        return socket;
    }

    socket = io(BACKEND_URL, {
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5
    });

    socket.on('connect', () => {
        console.log('✅ WebSocket connected:', socket?.id);
    });

    socket.on('disconnect', () => {
        console.log('❌ WebSocket disconnected');
        socket = null;  // Reset for auto-reconnection
        registeredListeners.clear();
    });

    socket.on('connect_error', (error) => {
        console.error('⚠️ WebSocket connection error:', error);
    });

    return socket;
};

export const getSocket = (): Socket | null => {
    return socket;
};

export const joinMatch = (matchId: string): void => {
    if (!socket) {
        initializeWebSocket();
    }
    socket?.emit('join-match', matchId);
};

export const leaveMatch = (matchId: string): void => {
    socket?.emit('leave-match', matchId);
};

export const onScoreUpdate = (callback: (data: any) => void): (() => void) => {
    if (!socket) {
        initializeWebSocket();
    }
    
    // Prevent duplicate listeners
    if (!registeredListeners.has(callback)) {
        registeredListeners.add(callback);
        socket?.on('score-update', callback);
    }
    
    // Return unsubscribe function
    return () => {
        registeredListeners.delete(callback);
        socket?.off('score-update', callback);
    };
};

export const disconnectWebSocket = (): void => {
    if (socket) {
        socket.disconnect();
        socket = null;
        registeredListeners.clear();
    }
};
