import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';
import { cacheGet, cacheSet } from '../config/redis.js';

export const protect = async (req, res, next) => {
  try {
    let token;

    // Check for token in header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Try to get user from cache first
      let user = await cacheGet(`user:${decoded.id}`);

      if (!user) {
        // If not in cache, fetch from database
        user = await User.findById(decoded.id).select('-password');
        
        if (!user) {
          return res.status(401).json({
            success: false,
            message: 'User not found'
          });
        }

        // Cache the user data
        await cacheSet(`user:${decoded.id}`, user, 3600);
      }

      req.user = user;
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error in authentication'
    });
  }
};
