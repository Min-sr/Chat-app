import Conversation from '../models/conversation.model.js';
import Message from '../models/message.model.js';
import { emitToUser } from '../sockets/index.js';

// @desc    Create or get private conversation
// @route   POST /api/conversations
// @access  Private
export const createConversation = async (req, res) => {
  try {
    const { participantId } = req.body;
    const currentUserId = req.user.id;

    if (!participantId) {
      return res.status(400).json({
        success: false,
        message: 'Participant ID is required'
      });
    }

    // Find or create private conversation
    const conversation = await Conversation.createOrGetPrivate(currentUserId, participantId);
    
    await conversation.populate('participants', 'username email avatar isOnline lastSeen');
    await conversation.populate('lastMessage');

    res.status(200).json({
      success: true,
      data: conversation
    });
  } catch (error) {
    console.error('Create conversation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Create group conversation
// @route   POST /api/conversations/group
// @access  Private
export const createGroupConversation = async (req, res) => {
  try {
    const { name, participantIds } = req.body;
    const currentUserId = req.user.id;

    if (!name || !participantIds || participantIds.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Group name and at least 2 participants are required'
      });
    }

    // Add current user to participants
    const allParticipants = [...new Set([currentUserId, ...participantIds])];

    const conversation = await Conversation.create({
      name,
      type: 'group',
      participants: allParticipants,
      admin: currentUserId
    });

    await conversation.populate('participants', 'username email avatar isOnline');
    await conversation.populate('admin', 'username email avatar');

    // Create system message
    await Message.create({
      conversation: conversation._id,
      sender: currentUserId,
      type: 'system',
      content: `${req.user.username} created the group`
    });

    // Notify all participants
    allParticipants.forEach(participantId => {
      if (participantId.toString() !== currentUserId) {
        emitToUser(participantId.toString(), 'group_created', {
          conversation
        });
      }
    });

    res.status(201).json({
      success: true,
      data: conversation
    });
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get all conversations for user
// @route   GET /api/conversations
// @access  Private
export const getConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user.id,
      isActive: true
    })
    .populate('participants', 'username email avatar isOnline lastSeen')
    .populate('admin', 'username email avatar')
    .populate({
      path: 'lastMessage',
      populate: {
        path: 'sender',
        select: 'username avatar'
      }
    })
    .sort({ updatedAt: -1 });

    res.status(200).json({
      success: true,
      count: conversations.length,
      data: conversations
    });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get conversation by ID
// @route   GET /api/conversations/:id
// @access  Private
export const getConversationById = async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id)
      .populate('participants', 'username email avatar isOnline lastSeen')
      .populate('admin', 'username email avatar');

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    // Check if user is participant
    if (!conversation.participants.some(p => p._id.toString() === req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this conversation'
      });
    }

    res.status(200).json({
      success: true,
      data: conversation
    });
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Add participant to group
// @route   POST /api/conversations/:id/participants
// @access  Private (Admin only)
export const addParticipant = async (req, res) => {
  try {
    const { userId } = req.body;
    const conversation = await Conversation.findById(req.params.id);

    if (!conversation || conversation.type !== 'group') {
      return res.status(404).json({
        success: false,
        message: 'Group conversation not found'
      });
    }

    // Check if user is admin
    if (conversation.admin.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only group admin can add participants'
      });
    }

    // Add participant
    if (!conversation.participants.includes(userId)) {
      conversation.participants.push(userId);
      await conversation.save();

      // Create system message
      await Message.create({
        conversation: conversation._id,
        sender: req.user.id,
        type: 'system',
        content: `${req.user.username} added a new member`
      });

      await conversation.populate('participants', 'username email avatar');

      // Notify new participant
      emitToUser(userId, 'added_to_group', { conversation });
    }

    res.status(200).json({
      success: true,
      data: conversation
    });
  } catch (error) {
    console.error('Add participant error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Remove participant from group
// @route   DELETE /api/conversations/:id/participants/:userId
// @access  Private (Admin only)
export const removeParticipant = async (req, res) => {
  try {
    const { userId } = req.params;
    const conversation = await Conversation.findById(req.params.id);

    if (!conversation || conversation.type !== 'group') {
      return res.status(404).json({
        success: false,
        message: 'Group conversation not found'
      });
    }

    // Check if user is admin
    if (conversation.admin.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only group admin can remove participants'
      });
    }

    // Remove participant
    conversation.participants = conversation.participants.filter(
      p => p.toString() !== userId
    );
    await conversation.save();

    // Notify removed user
    emitToUser(userId, 'removed_from_group', {
      conversationId: conversation._id
    });

    res.status(200).json({
      success: true,
      message: 'Participant removed successfully'
    });
  } catch (error) {
    console.error('Remove participant error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Leave group
// @route   POST /api/conversations/:id/leave
// @access  Private
export const leaveGroup = async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);

    if (!conversation || conversation.type !== 'group') {
      return res.status(404).json({
        success: false,
        message: 'Group conversation not found'
      });
    }

    // Remove user from participants
    conversation.participants = conversation.participants.filter(
      p => p.toString() !== req.user.id
    );

    // If admin leaves, assign new admin
    if (conversation.admin.toString() === req.user.id && conversation.participants.length > 0) {
      conversation.admin = conversation.participants[0];
    }

    await conversation.save();

    res.status(200).json({
      success: true,
      message: 'Left group successfully'
    });
  } catch (error) {
    console.error('Leave group error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Delete group (Admin only)
// @route   DELETE /api/conversations/:id
// @access  Private (Admin only)
export const deleteGroup = async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);

    if (!conversation || conversation.type !== 'group') {
      return res.status(404).json({
        success: false,
        message: 'Group conversation not found'
      });
    }

    // Check if user is admin
    if (conversation.admin.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only group admin can delete the group'
      });
    }

    // Mark as inactive instead of deleting
    conversation.isActive = false;
    await conversation.save();

    res.status(200).json({
      success: true,
      message: 'Group deleted successfully'
    });
  } catch (error) {
    console.error('Delete group error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};
