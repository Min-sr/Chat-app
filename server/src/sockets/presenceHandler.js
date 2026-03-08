import User from '../models/user.model.js';

const activeUsers = new Map();

export const setupPresenceHandlers = (io, socket) => {

  // User online
  socket.on('user_online', async () => {
    try {
      activeUsers.set(socket.userId, { socketId: socket.id, lastSeen: new Date() });

      await User.findByIdAndUpdate(socket.userId, {
        isOnline: true,
        lastSeen: new Date()
      });

      const user = await User.findById(socket.userId).select('friends');
      if (user?.friends?.length) {
        user.friends.forEach(friendId => {
          // Emit tới room của từng friend
          io.to(`user:${friendId}`).emit('user_online', { userId: socket.userId });
        });
      }

      console.log(`✅ User ${socket.userId} is now online`);
    } catch (error) {
      console.error('User online error:', error);
    }
  });

  // User disconnect
  socket.on('disconnect', async () => {
    try {
      activeUsers.delete(socket.userId);

      await User.findByIdAndUpdate(socket.userId, {
        isOnline: false,
        lastSeen: new Date()
      });

      const user = await User.findById(socket.userId).select('friends');
      if (user?.friends?.length) {
        user.friends.forEach(friendId => {
          io.to(`user:${friendId}`).emit('user_offline', { userId: socket.userId });
        });
      }

      console.log(`User ${socket.userId} is now offline`);
    } catch (error) {
      console.error('User offline error:', error);
    }
  });

  // Get online users
  socket.on('get_online_users', (userIds) => {
    const onlineUsers = userIds.filter(id => activeUsers.has(id.toString()));
    socket.emit('online_users', onlineUsers);
  });
};

export const isUserOnline = (userId) => activeUsers.has(userId.toString());
export const getOnlineUsers = () => Array.from(activeUsers.keys());