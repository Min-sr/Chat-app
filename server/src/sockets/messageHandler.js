import Message from '../models/message.model.js';
import Conversation from '../models/conversation.model.js';

export const setupMessageHandlers = (io, socket) => {
  
  // Join conversation room
  socket.on('join_conversation', async (conversationId) => {
    try {
      socket.join(`conversation:${conversationId}`);
      console.log(`User ${socket.userId} joined conversation: ${conversationId}`);
    } catch (error) {
      console.error('Join conversation error:', error);
    }
  });

  // Leave conversation room
  socket.on('leave_conversation', (conversationId) => {
    socket.leave(`conversation:${conversationId}`);
    console.log(`User ${socket.userId} left conversation: ${conversationId}`);
  });

  // Send message
  socket.on('send_message', async (data) => {
    try {
      const { conversationId, content, type, metadata } = data;

      // Create message in database
      const message = await Message.create({
        conversation: conversationId,
        sender: socket.userId,
        content,
        type: type || 'text',
        metadata: metadata || {}
      });

      // Populate sender info
      await message.populate('sender', 'username avatar email');

      // Update conversation's last message
      await Conversation.findByIdAndUpdate(conversationId, {
        lastMessage: message._id,
        updatedAt: new Date()
      });

      // Emit to all users in conversation
      io.to(`conversation:${conversationId}`).emit('new_message', {
        message,
        conversationId
      });

      console.log(`Message sent in conversation ${conversationId} by user ${socket.userId}`);
    } catch (error) {
      console.error('Send message error:', error);
      socket.emit('message_error', { 
        error: 'Failed to send message',
        details: error.message 
      });
    }
  });

  // Typing indicator
  socket.on('typing_start', ({ conversationId }) => {
    socket.to(`conversation:${conversationId}`).emit('user_typing', {
      userId: socket.userId,
      conversationId,
      username: socket.user.username
    });
  });

  socket.on('typing_stop', ({ conversationId }) => {
    socket.to(`conversation:${conversationId}`).emit('user_stop_typing', {
      userId: socket.userId,
      conversationId
    });
  });

  // Mark messages as read
  socket.on('mark_read', async ({ conversationId, messageIds }) => {
    try {
      await Message.updateMany(
        {
          _id: { $in: messageIds },
          conversation: conversationId,
          sender: { $ne: socket.userId }
        },
        {
          $addToSet: { readBy: socket.userId }
        }
      );

      // Notify other users
      socket.to(`conversation:${conversationId}`).emit('messages_read', {
        conversationId,
        messageIds,
        readBy: socket.userId
      });
    } catch (error) {
      console.error('Mark read error:', error);
    }
  });
};
