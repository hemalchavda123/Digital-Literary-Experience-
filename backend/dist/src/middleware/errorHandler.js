"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNotFoundError = exports.createConflictError = exports.createAuthError = exports.createValidationError = exports.errorHandler = exports.AppError = void 0;
const client_1 = require("@prisma/client");
/**
 * Custom error class for application-specific errors
 */
class AppError extends Error {
    constructor(statusCode, code, message, details) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        this.name = 'AppError';
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
/**
 * Centralized error handling middleware
 *
 * Handles:
 * - Validation errors (400) with field-specific messages
 * - Authentication errors (401) with generic messages
 * - Conflict errors (409) for duplicate email/username
 * - Database errors (500) without exposing sensitive details
 *
 * Validates Requirements: 7.2, 7.3, 7.4, 7.5
 */
const errorHandler = (err, req, res, next) => {
    // Log error for debugging (in production, use proper logging service)
    console.error('Error:', {
        name: err.name,
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
    // Handle custom AppError
    if (err instanceof AppError) {
        const response = {
            error: {
                message: err.message,
                code: err.code,
                ...(err.details && { details: err.details }),
            },
        };
        res.status(err.statusCode).json(response);
        return;
    }
    // Handle Prisma database errors
    if (err instanceof client_1.Prisma.PrismaClientKnownRequestError) {
        handlePrismaError(err, res);
        return;
    }
    // Handle Prisma validation errors
    if (err instanceof client_1.Prisma.PrismaClientValidationError) {
        res.status(400).json({
            error: {
                message: 'Invalid data provided',
                code: 'VALIDATION_ERROR',
            },
        });
        return;
    }
    // Handle JWT errors (from jsonwebtoken library)
    if (err.name === 'JsonWebTokenError') {
        res.status(401).json({
            error: {
                message: 'Invalid or missing token',
                code: 'INVALID_TOKEN',
            },
        });
        return;
    }
    if (err.name === 'TokenExpiredError') {
        res.status(401).json({
            error: {
                message: 'Token expired',
                code: 'TOKEN_EXPIRED',
            },
        });
        return;
    }
    // Handle generic errors - don't expose sensitive details
    res.status(500).json({
        error: {
            message: 'An unexpected error occurred',
            code: 'INTERNAL_ERROR',
        },
    });
};
exports.errorHandler = errorHandler;
/**
 * Handle Prisma-specific database errors
 * Maps Prisma error codes to appropriate HTTP responses
 *
 * Validates Requirements: 7.3, 7.4, 7.5
 */
function handlePrismaError(err, res) {
    switch (err.code) {
        // Unique constraint violation
        case 'P2002': {
            const target = err.meta?.target;
            const field = target?.[0] || 'field';
            // Map field names to user-friendly messages
            let message = 'Resource already exists';
            let code = 'CONFLICT';
            if (field === 'email') {
                message = 'Email already registered';
                code = 'EMAIL_EXISTS';
            }
            else if (field === 'username') {
                message = 'Username already taken';
                code = 'USERNAME_EXISTS';
            }
            res.status(409).json({
                error: {
                    message,
                    code,
                },
            });
            break;
        }
        // Record not found
        case 'P2025':
            res.status(404).json({
                error: {
                    message: 'Resource not found',
                    code: 'NOT_FOUND',
                },
            });
            break;
        // Foreign key constraint violation
        case 'P2003':
            res.status(400).json({
                error: {
                    message: 'Invalid reference to related resource',
                    code: 'INVALID_REFERENCE',
                },
            });
            break;
        // Connection error
        case 'P1001':
        case 'P1002':
        case 'P1008':
            res.status(500).json({
                error: {
                    message: 'Database connection error',
                    code: 'DATABASE_ERROR',
                },
            });
            break;
        // Default: Generic database error without exposing details
        default:
            res.status(500).json({
                error: {
                    message: 'An unexpected error occurred',
                    code: 'INTERNAL_ERROR',
                },
            });
    }
}
/**
 * Helper function to create validation errors
 * Used by controllers to throw validation errors
 */
function createValidationError(details) {
    return new AppError(400, 'VALIDATION_ERROR', 'Validation failed', details);
}
exports.createValidationError = createValidationError;
/**
 * Helper function to create authentication errors
 * Used by controllers to throw authentication errors
 */
function createAuthError(message = 'Invalid credentials') {
    return new AppError(401, 'INVALID_CREDENTIALS', message);
}
exports.createAuthError = createAuthError;
/**
 * Helper function to create conflict errors
 * Used by controllers to throw conflict errors
 */
function createConflictError(message, code = 'CONFLICT') {
    return new AppError(409, code, message);
}
exports.createConflictError = createConflictError;
/**
 * Helper function to create not found errors
 */
function createNotFoundError(message = 'Resource not found') {
    return new AppError(404, 'NOT_FOUND', message);
}
exports.createNotFoundError = createNotFoundError;
