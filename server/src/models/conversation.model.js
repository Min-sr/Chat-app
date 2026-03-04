import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true
  },
  type: {
    type: String,
    enum: ['private', 'group'],
    default: 'private'
  },
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  avatar: {
    type: String,
    default: ''
  },
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for faster queries
conversationSchema.index({ participants: 1 });
conversationSchema.index({ updatedAt: -1 });

// Find private conversation between two users
conversationSchema.statics.findPrivateConversation = async function(user1Id, user2Id) {
  return await this.findOne({
    type: 'private',
    participants: { $all: [user1Id, user2Id], $size: 2 }
  });
};

// Create or get private conversation
conversationSchema.statics.createOrGetPrivate = async function(user1Id, user2Id) {
  let conversation = await this.findPrivateConversation(user1Id, user2Id);
  
  if (!conversation) {
    conversation = await this.create({
      type: 'private',
      participants: [user1Id, user2Id]
    });
  }
  
  return conversation;
};

const Conversation = mongoose.model('Conversation', conversationSchema);

export default Conversation;
