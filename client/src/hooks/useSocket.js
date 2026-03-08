import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

let socket = null;

export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const { token, user } = useAuthStore();
  const reconnectTimer = useRef(null);

  useEffect(() => {
    if (!token || !user) return;

    // Tránh tạo nhiều connection
    if (socket?.connected) return;

    socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('✅ Socket connected:', socket.id);
      setIsConnected(true);
      socket.emit('user_online');
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason);
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
      setIsConnected(false);
    });

    return () => {
      clearTimeout(reconnectTimer.current);
      if (socket) {
        socket.disconnect();
        socket = null;
      }
    };
  }, [token, user?._id]);

  return { socket, isConnected };
};

export const getSocket = () => socket;