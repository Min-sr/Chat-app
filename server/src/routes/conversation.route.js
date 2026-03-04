import express from 'express';
import { 
  createConversation,
  getConversations,
  getConversationById,
  createGroupConversation,
  addParticipant,
  removeParticipant,
  leaveGroup,
  deleteGroup
} from '../controllers/conversation.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = express.Router();

// All routes are protected
router.use(protect);

router.post('/', createConversation);
router.post('/group', createGroupConversation);
router.get('/', getConversations);
router.get('/:id', getConversationById);
router.post('/:id/participants', addParticipant);
router.delete('/:id/participants/:userId', removeParticipant);
router.post('/:id/leave', leaveGroup);
router.delete('/:id', deleteGroup);

export default router;
