import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import jwt from 'jsonwebtoken';
import { setupMessageHandlers } from './messageHandler.js';
import { setupCallHandlers } from './callHandler.js';
import { setupPresenceHandlers } from './presenceHandler.js';

let io;

export const initSocket = async (server) => {
  // Initialize Socket.io server
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true
    },
    pingTimeout: 60000,
  });

  // Setup Redis Adapter for scaling (Level 4)
  try {
    const pubClient = createClient({ url: process.env.REDIS_URL });
    const subClient = pubClient.duplicate();

    await Promise.all([pubClient.connect(), subClient.connect()]);

    io.adapter(createAdapter(pubClient, subClient));
    console.log('✅ Socket.io Redis Adapter initialized');
  } catch (error) {
    console.warn('⚠️  Redis Adapter not available:', error.message);
    console.log('Running Socket.io without Redis adapter (single instance mode)');
  }

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      socket.user = decoded;
      
      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  // Connection handler
  io.on('connection', (socket) => {
    console.log(`✅ User connected: ${socket.userId} (Socket ID: ${socket.id})`);

    // Join user's personal room
    socket.join(`user:${socket.userId}`);

    // Setup event handlers
    setupPresenceHandlers(io, socket);
    setupMessageHandlers(io, socket);
    setupCallHandlers(io, socket);

    // Handle disconnect
    socket.on('disconnect', (reason) => {
      console.log(`❌ User disconnected: ${socket.userId} - Reason: ${reason}`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

// Helper function to emit to specific user
export const emitToUser = (userId, event, data) => {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
};

// Helper function to emit to room (conversation)
export const emitToRoom = (roomId, event, data) => {
  if (io) {
    io.to(`conversation:${roomId}`).emit(event, data);
  }
};
