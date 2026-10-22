import { Router } from 'express';
import {
  register,
  login,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
  getCurrentUser,
  googleAuth,
  verifyEmail,
} from '../controllers/authController';
import { authMiddleware } from '../middleware/authMiddleware';
import {
  validateRegistration,
  validateLogin,
  validatePasswordReset,
  validateForgotPassword,
} from '../middleware/validationMiddleware';

const router = Router();

/**
 * Authentication routes with validation middleware
 * 
 * The validation middleware runs before the controller handlers
 * and returns 400 errors with field-specific details if validation fails
 */

// Public routes
router.post('/register', validateRegistration, register);
router.post('/login', validateLogin, login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.post('/forgot-password', validateForgotPassword, forgotPassword);
router.post('/reset-password', validatePasswordReset, resetPassword);
router.post('/verify-email', verifyEmail);
router.post('/google', googleAuth);

// Protected routes
router.get('/me', authMiddleware, getCurrentUser);

export default router;
