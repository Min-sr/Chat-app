import express from 'express';
import { register, login, getMe, updateProfile } from '../controllers/auth.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { verifyEmail } from '../controllers/auth.controller.js';
const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.get('/verify/:token', verifyEmail);
export default router;
