import User from '../models/user.model.js';

// Store active users in memory (or use Redis for distributed systems)
const activeUsers = new Map();

export const setupPresenceHandlers = (io, socket) => {
  
  // User comes online
  socket.on('user_online', async () => {
    try {
      activeUsers.set(socket.userId, {
        socketId: socket.id,
        lastSeen: new Date()
      });

      // Update user status in database
      await User.findByIdAndUpdate(socket.userId, {
        isOnline: true,
        lastSeen: new Date()
      });

      // Notify all friends that user is online
      const user = await User.findById(socket.userId).select('friends');
      if (user && user.friends) {
        user.friends.forEach(friendId => {
          io.to(`user:${friendId}`).emit('friend_online', {
            userId: socket.userId,
            timestamp: new Date()
          });
        });
      }

      console.log(`User ${socket.userId} is now online`);
    } catch (error) {
      console.error('User online error:', error);
    }
  });

  // Handle disconnect - user goes offline
  socket.on('disconnect', async () => {
    try {
      activeUsers.delete(socket.userId);

      // Update user status in database
      await User.findByIdAndUpdate(socket.userId, {
        isOnline: false,
        lastSeen: new Date()
      });

      // Notify all friends that user is offline
      const user = await User.findById(socket.userId).select('friends');
      if (user && user.friends) {
        user.friends.forEach(friendId => {
          io.to(`user:${friendId}`).emit('friend_offline', {
            userId: socket.userId,
            lastSeen: new Date()
          });
        });
      }

      console.log(`User ${socket.userId} is now offline`);
    } catch (error) {
      console.error('User offline error:', error);
    }
  });

  // Get online status
  socket.on('get_online_users', async (userIds) => {
    try {
      const onlineUsers = userIds.filter(id => activeUsers.has(id.toString()));
      socket.emit('online_users', onlineUsers);
    } catch (error) {
      console.error('Get online users error:', error);
    }
  });
};

// Helper function to check if user is online
export const isUserOnline = (userId) => {
  return activeUsers.has(userId.toString());
};

// Helper function to get all online users
export const getOnlineUsers = () => {
  return Array.from(activeUsers.keys());
};
