import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  conversation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
    index: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['text', 'image', 'file', 'video', 'audio', 'system'],
    default: 'text'
  },
  content: {
    type: String,
    required: function() {
      return this.type === 'text' || this.type === 'system';
    }
  },
  fileUrl: {
    type: String
  },
  fileName: {
    type: String
  },
  fileSize: {
    type: Number
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  readBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  deletedFor: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  isEdited: {
    type: Boolean,
    default: false
  },
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  }
}, {
  timestamps: true
});

// Indexes for performance
messageSchema.index({ conversation: 1, createdAt: -1 });
messageSchema.index({ sender: 1 });

// Virtual for checking if message is read
messageSchema.virtual('isRead').get(function() {
  return this.readBy && this.readBy.length > 0;
});

// Method to mark as read by user
messageSchema.methods.markAsRead = async function(userId) {
  if (!this.readBy.includes(userId) && this.sender.toString() !== userId.toString()) {
    this.readBy.push(userId);
    await this.save();
  }
};

const Message = mongoose.model('Message', messageSchema);

export default Message;
