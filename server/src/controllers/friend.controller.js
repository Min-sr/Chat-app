import User from '../models/user.model.js';
import { emitToUser } from '../sockets/index.js';

// @desc    Send friend request
// @route   POST /api/friends/request/:userId
// @access  Private
export const sendFriendRequest = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    if (userId === currentUserId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot send friend request to yourself'
      });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if already friends
    if (targetUser.friends.includes(currentUserId)) {
      return res.status(400).json({
        success: false,
        message: 'Already friends with this user'
      });
    }

    // Check if request already exists
    const existingRequest = targetUser.friendRequests.find(
      req => req.from.toString() === currentUserId
    );

    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message: 'Friend request already sent'
      });
    }

    // Add friend request
    targetUser.friendRequests.push({ from: currentUserId });
    await targetUser.save();

    // Populate the request for response
    await targetUser.populate('friendRequests.from', 'username email avatar');

    // Emit socket event to target user
    emitToUser(userId, 'friend_request_received', {
      from: req.user
    });

    res.status(200).json({
      success: true,
      message: 'Friend request sent successfully'
    });
  } catch (error) {
    console.error('Send friend request error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Accept friend request
// @route   POST /api/friends/accept/:requestId
// @access  Private
export const acceptFriendRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const currentUserId = req.user.id;

    const currentUser = await User.findById(currentUserId);
    
    // Find the request
    const requestIndex = currentUser.friendRequests.findIndex(
      req => req._id.toString() === requestId
    );

    if (requestIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Friend request not found'
      });
    }

    const fromUserId = currentUser.friendRequests[requestIndex].from;

    // Add to friends list for both users
    currentUser.friends.push(fromUserId);
    await currentUser.save();

    await User.findByIdAndUpdate(fromUserId, {
      $push: { friends: currentUserId }
    });

    // Remove the request
    currentUser.friendRequests.splice(requestIndex, 1);
    await currentUser.save();

    // Emit socket events
    emitToUser(fromUserId.toString(), 'friend_request_accepted', {
      user: req.user
    });

    res.status(200).json({
      success: true,
      message: 'Friend request accepted'
    });
  } catch (error) {
    console.error('Accept friend request error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Reject friend request
// @route   POST /api/friends/reject/:requestId
// @access  Private
export const rejectFriendRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const currentUserId = req.user.id;

    const currentUser = await User.findById(currentUserId);
    
    const requestIndex = currentUser.friendRequests.findIndex(
      req => req._id.toString() === requestId
    );

    if (requestIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Friend request not found'
      });
    }

    currentUser.friendRequests.splice(requestIndex, 1);
    await currentUser.save();

    res.status(200).json({
      success: true,
      message: 'Friend request rejected'
    });
  } catch (error) {
    console.error('Reject friend request error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get friend requests
// @route   GET /api/friends/requests
// @access  Private
export const getFriendRequests = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('friendRequests.from', 'username email avatar isOnline');

    res.status(200).json({
      success: true,
      data: user.friendRequests
    });
  } catch (error) {
    console.error('Get friend requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get friends list
// @route   GET /api/friends
// @access  Private
export const getFriends = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('friends', 'username email avatar bio isOnline lastSeen');

    res.status(200).json({
      success: true,
      count: user.friends.length,
      data: user.friends
    });
  } catch (error) {
    console.error('Get friends error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Remove friend
// @route   DELETE /api/friends/:friendId
// @access  Private
export const removeFriend = async (req, res) => {
  try {
    const { friendId } = req.params;
    const currentUserId = req.user.id;

    // Remove from both users' friend lists
    await User.findByIdAndUpdate(currentUserId, {
      $pull: { friends: friendId }
    });

    await User.findByIdAndUpdate(friendId, {
      $pull: { friends: currentUserId }
    });

    res.status(200).json({
      success: true,
      message: 'Friend removed successfully'
    });
  } catch (error) {
    console.error('Remove friend error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};
