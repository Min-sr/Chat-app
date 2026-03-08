import Message from '../models/message.model.js';
import Conversation from '../models/conversation.model.js';

export const setupMessageHandlers = (io, socket) => {

  // Join conversation room
  socket.on('join_conversation', ({ conversationId }) => {
    socket.join(`conversation:${conversationId}`);
  });

  // Leave conversation room
  socket.on('leave_conversation', ({ conversationId }) => {
    socket.leave(`conversation:${conversationId}`);
  });

  // Send message (text)
  socket.on('send_message', async (data) => {
    try {
      const { conversationId, content, type = 'text', fileUrl, fileName, fileSize, metadata } = data;

      const message = await Message.create({
        conversation: conversationId,
        sender: socket.userId,
        content: content || '',
        type,
        fileUrl,
        fileName,
        fileSize,
        metadata: metadata || {},
        readBy: [socket.userId], // Người gửi đã đọc ngay
      });

      await message.populate('sender', 'username avatar email');

      await Conversation.findByIdAndUpdate(conversationId, {
        lastMessage: message._id,
        updatedAt: new Date(),
      });

      // Emit tới tất cả người trong conversation (kể cả người gửi để confirm)
      io.to(`conversation:${conversationId}`).emit('new_message', {
        message,
        conversationId,
      });

    } catch (error) {
      console.error('Send message error:', error);
      socket.emit('message_error', { error: 'Failed to send message' });
    }
  });

  // Mark message as read — FIX: cập nhật đúng tất cả tin nhắn chưa đọc
  socket.on('message_read', async ({ messageId, conversationId }) => {
    try {
      // Đánh dấu tất cả tin nhắn trong conversation (không chỉ 1 tin) là đã đọc
      await Message.updateMany(
        {
          conversation: conversationId,
          sender: { $ne: socket.userId },
          readBy: { $ne: socket.userId },
        },
        { $addToSet: { readBy: socket.userId } }
      );

      // Thông báo cho người gửi biết tin nhắn đã được đọc
      socket.to(`conversation:${conversationId}`).emit('messages_read', {
        conversationId,
        readBy: socket.userId,
      });

    } catch (error) {
      console.error('Mark read error:', error);
    }
  });

  // Typing indicators
  socket.on('typing_start', ({ conversationId }) => {
    socket.to(`conversation:${conversationId}`).emit('user_typing', {
      userId: socket.userId,
      conversationId,
      username: socket.user?.username,
    });
  });

  socket.on('typing_stop', ({ conversationId }) => {
    socket.to(`conversation:${conversationId}`).emit('user_stop_typing', {
      userId: socket.userId,
      conversationId,
    });
  });
};