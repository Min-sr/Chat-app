import Message from '../models/message.model.js';
import Conversation from '../models/conversation.model.js';

// @desc    Get messages for a conversation
// @route   GET /api/messages/:conversationId
// @access  Private
export const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    // Verify user is part of conversation
    const conversation = await Conversation.findById(conversationId);
    
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    if (!conversation.participants.includes(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this conversation'
      });
    }

    // Get messages with pagination
    const messages = await Message.find({
      conversation: conversationId,
      deletedFor: { $ne: req.user.id }
    })
    .populate('sender', 'username avatar email')
    .populate('replyTo', 'content sender')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

    const count = await Message.countDocuments({
      conversation: conversationId,
      deletedFor: { $ne: req.user.id }
    });

    res.status(200).json({
      success: true,
      data: messages.reverse(), // Reverse to show oldest first
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Upload file for message
// @route   POST /api/messages/upload
// @access  Private
export const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    const fileType = req.file.mimetype.startsWith('image/') ? 'image' : 
                     req.file.mimetype.startsWith('video/') ? 'video' : 'file';

    res.status(200).json({
      success: true,
      data: {
        fileUrl,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        fileType,
        mimetype: req.file.mimetype
      }
    });
  } catch (error) {
    console.error('Upload file error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};
