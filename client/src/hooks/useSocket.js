import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

let socket = null;

export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const { token, user } = useAuthStore();

  useEffect(() => {
    if (token && user) {
      // Initialize socket connection
      socket = io(SOCKET_URL, {
        auth: {
          token: token,
        },
        transports: ['websocket', 'polling'],
      });

      socket.on('connect', () => {
        console.log('✅ Socket connected');
        setIsConnected(true);
        
        // Emit user_online event
        socket.emit('user_online');
      });

      socket.on('disconnect', () => {
        console.log('❌ Socket disconnected');
        setIsConnected(false);
      });

      socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        setIsConnected(false);
      });

      return () => {
        if (socket) {
          socket.disconnect();
          socket = null;
        }
      };
    }
  }, [token, user]);

  return { socket, isConnected };
};

export const getSocket = () => socket;
