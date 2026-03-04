import express from 'express';
import { searchUsers, getUserById } from '../controllers/user.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = express.Router();

// All routes are protected
router.use(protect);

router.get('/search', searchUsers);
router.get('/:id', getUserById);

export default router;
