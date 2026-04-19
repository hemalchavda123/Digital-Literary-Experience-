"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController_1 = require("../controllers/authController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const validationMiddleware_1 = require("../middleware/validationMiddleware");
const router = (0, express_1.Router)();
/**
 * Authentication routes with validation middleware
 *
 * The validation middleware runs before the controller handlers
 * and returns 400 errors with field-specific details if validation fails
 */
// Public routes
router.post('/register', validationMiddleware_1.validateRegistration, authController_1.register);
router.post('/login', validationMiddleware_1.validateLogin, authController_1.login);
router.post('/refresh', authController_1.refresh);
router.post('/logout', authController_1.logout);
router.post('/forgot-password', validationMiddleware_1.validateForgotPassword, authController_1.forgotPassword);
router.post('/reset-password', validationMiddleware_1.validatePasswordReset, authController_1.resetPassword);
// Protected routes
router.get('/me', authMiddleware_1.authMiddleware, authController_1.getCurrentUser);
exports.default = router;
