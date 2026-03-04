import express from 'express';
import { getMessages, uploadFile } from '../controllers/message.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import multer from 'multer';
import path from 'path';

const router = express.Router();

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB default
  },
  fileFilter: (req, file, cb) => {
    // Allow images, videos, and documents
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|mp4|avi|mov/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// All routes are protected
router.use(protect);

router.get('/:conversationId', getMessages);
router.post('/upload', upload.single('file'), uploadFile);

export default router;
