import express from 'express';
import { 
  sendFriendRequest, 
  acceptFriendRequest, 
  rejectFriendRequest,
  getFriendRequests,
  getFriends,
  removeFriend
} from '../controllers/friend.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = express.Router();

// All routes are protected
router.use(protect);

router.post('/request/:userId', sendFriendRequest);
router.post('/accept/:requestId', acceptFriendRequest);
router.post('/reject/:requestId', rejectFriendRequest);
router.get('/requests', getFriendRequests);
router.get('/', getFriends);
router.delete('/:friendId', removeFriend);

export default router;
