"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateForgotPassword = exports.validatePasswordReset = exports.validateLogin = exports.validateRegistration = exports.handleValidationErrors = void 0;
const express_validator_1 = require("express-validator");
/**
 * Validation error handling middleware
 * Returns 400 with field-specific errors if validation fails
 */
const handleValidationErrors = (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        const details = {};
        errors.array().forEach((error) => {
            if (error.type === 'field') {
                const field = error.path;
                if (!details[field]) {
                    details[field] = [];
                }
                details[field].push(error.msg);
            }
        });
        res.status(400).json({
            error: {
                message: 'Validation failed',
                code: 'VALIDATION_ERROR',
                details,
            },
        });
        return;
    }
    next();
};
exports.handleValidationErrors = handleValidationErrors;
/**
 * Registration validation rules
 * Validates: email format, username length (3-30), password length (min 8)
 */
exports.validateRegistration = [
    (0, express_validator_1.body)('email')
        .isEmail()
        .withMessage('Invalid email format')
        .normalizeEmail(),
    (0, express_validator_1.body)('username')
        .isLength({ min: 3, max: 30 })
        .withMessage('Username must be between 3 and 30 characters')
        .trim(),
    (0, express_validator_1.body)('password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters'),
    exports.handleValidationErrors,
];
/**
 * Login validation rules
 * Validates: email format, password not empty
 */
exports.validateLogin = [
    (0, express_validator_1.body)('email')
        .isEmail()
        .withMessage('Invalid email format')
        .normalizeEmail(),
    (0, express_validator_1.body)('password')
        .notEmpty()
        .withMessage('Password is required'),
    exports.handleValidationErrors,
];
/**
 * Password reset validation rules
 * Validates: token length (64 chars), password length (min 8)
 */
exports.validatePasswordReset = [
    (0, express_validator_1.body)('token')
        .isLength({ min: 64, max: 64 })
        .withMessage('Invalid reset token format'),
    (0, express_validator_1.body)('password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters'),
    exports.handleValidationErrors,
];
/**
 * Forgot password validation rules
 * Validates: email format
 */
exports.validateForgotPassword = [
    (0, express_validator_1.body)('email')
        .isEmail()
        .withMessage('Invalid email format')
        .normalizeEmail(),
    exports.handleValidationErrors,
];
