"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const client_1 = require("@prisma/client");
const errorHandler_1 = require("./errorHandler");
(0, vitest_1.describe)('Error Handler Middleware', () => {
    let req;
    let res;
    let next;
    (0, vitest_1.beforeEach)(() => {
        req = {};
        res = {
            status: vitest_1.vi.fn().mockReturnThis(),
            json: vitest_1.vi.fn(),
        };
        next = vitest_1.vi.fn();
        // Mock console.error to avoid cluttering test output
        vitest_1.vi.spyOn(console, 'error').mockImplementation(() => { });
    });
    (0, vitest_1.describe)('AppError handling', () => {
        (0, vitest_1.it)('should handle validation errors (400) with field-specific messages', () => {
            const error = new errorHandler_1.AppError(400, 'VALIDATION_ERROR', 'Validation failed', {
                email: ['Invalid email format'],
                password: ['Password must be at least 8 characters'],
            });
            (0, errorHandler_1.errorHandler)(error, req, res, next);
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(400);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith({
                error: {
                    message: 'Validation failed',
                    code: 'VALIDATION_ERROR',
                    details: {
                        email: ['Invalid email format'],
                        password: ['Password must be at least 8 characters'],
                    },
                },
            });
        });
        (0, vitest_1.it)('should handle authentication errors (401) with generic messages', () => {
            const error = new errorHandler_1.AppError(401, 'INVALID_CREDENTIALS', 'Invalid credentials');
            (0, errorHandler_1.errorHandler)(error, req, res, next);
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(401);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith({
                error: {
                    message: 'Invalid credentials',
                    code: 'INVALID_CREDENTIALS',
                },
            });
        });
        (0, vitest_1.it)('should handle conflict errors (409) for duplicate resources', () => {
            const error = new errorHandler_1.AppError(409, 'EMAIL_EXISTS', 'Email already registered');
            (0, errorHandler_1.errorHandler)(error, req, res, next);
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(409);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith({
                error: {
                    message: 'Email already registered',
                    code: 'EMAIL_EXISTS',
                },
            });
        });
        (0, vitest_1.it)('should handle not found errors (404)', () => {
            const error = new errorHandler_1.AppError(404, 'NOT_FOUND', 'Resource not found');
            (0, errorHandler_1.errorHandler)(error, req, res, next);
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(404);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith({
                error: {
                    message: 'Resource not found',
                    code: 'NOT_FOUND',
                },
            });
        });
    });
    (0, vitest_1.describe)('Prisma error handling', () => {
        (0, vitest_1.it)('should handle unique constraint violation (P2002) for email', () => {
            const error = new client_1.Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
                code: 'P2002',
                clientVersion: '5.0.0',
                meta: { target: ['email'] },
            });
            (0, errorHandler_1.errorHandler)(error, req, res, next);
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(409);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith({
                error: {
                    message: 'Email already registered',
                    code: 'EMAIL_EXISTS',
                },
            });
        });
        (0, vitest_1.it)('should handle unique constraint violation (P2002) for username', () => {
            const error = new client_1.Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
                code: 'P2002',
                clientVersion: '5.0.0',
                meta: { target: ['username'] },
            });
            (0, errorHandler_1.errorHandler)(error, req, res, next);
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(409);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith({
                error: {
                    message: 'Username already taken',
                    code: 'USERNAME_EXISTS',
                },
            });
        });
        (0, vitest_1.it)('should handle record not found (P2025)', () => {
            const error = new client_1.Prisma.PrismaClientKnownRequestError('Record not found', {
                code: 'P2025',
                clientVersion: '5.0.0',
            });
            (0, errorHandler_1.errorHandler)(error, req, res, next);
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(404);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith({
                error: {
                    message: 'Resource not found',
                    code: 'NOT_FOUND',
                },
            });
        });
        (0, vitest_1.it)('should handle foreign key constraint violation (P2003)', () => {
            const error = new client_1.Prisma.PrismaClientKnownRequestError('Foreign key constraint failed', {
                code: 'P2003',
                clientVersion: '5.0.0',
            });
            (0, errorHandler_1.errorHandler)(error, req, res, next);
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(400);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith({
                error: {
                    message: 'Invalid reference to related resource',
                    code: 'INVALID_REFERENCE',
                },
            });
        });
        (0, vitest_1.it)('should handle database connection errors (P1001)', () => {
            const error = new client_1.Prisma.PrismaClientKnownRequestError('Connection error', {
                code: 'P1001',
                clientVersion: '5.0.0',
            });
            (0, errorHandler_1.errorHandler)(error, req, res, next);
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(500);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith({
                error: {
                    message: 'Database connection error',
                    code: 'DATABASE_ERROR',
                },
            });
        });
        (0, vitest_1.it)('should handle unknown Prisma errors without exposing sensitive details', () => {
            const error = new client_1.Prisma.PrismaClientKnownRequestError('Unknown error', {
                code: 'P9999',
                clientVersion: '5.0.0',
            });
            (0, errorHandler_1.errorHandler)(error, req, res, next);
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(500);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith({
                error: {
                    message: 'An unexpected error occurred',
                    code: 'INTERNAL_ERROR',
                },
            });
        });
    });
    (0, vitest_1.describe)('Prisma validation error handling', () => {
        (0, vitest_1.it)('should handle Prisma validation errors', () => {
            const error = new client_1.Prisma.PrismaClientValidationError('Validation error', { clientVersion: '5.0.0' });
            (0, errorHandler_1.errorHandler)(error, req, res, next);
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(400);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith({
                error: {
                    message: 'Invalid data provided',
                    code: 'VALIDATION_ERROR',
                },
            });
        });
    });
    (0, vitest_1.describe)('JWT error handling', () => {
        (0, vitest_1.it)('should handle JsonWebTokenError', () => {
            const error = new Error('Invalid token');
            error.name = 'JsonWebTokenError';
            (0, errorHandler_1.errorHandler)(error, req, res, next);
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(401);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith({
                error: {
                    message: 'Invalid or missing token',
                    code: 'INVALID_TOKEN',
                },
            });
        });
        (0, vitest_1.it)('should handle TokenExpiredError', () => {
            const error = new Error('Token expired');
            error.name = 'TokenExpiredError';
            (0, errorHandler_1.errorHandler)(error, req, res, next);
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(401);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith({
                error: {
                    message: 'Token expired',
                    code: 'TOKEN_EXPIRED',
                },
            });
        });
    });
    (0, vitest_1.describe)('Generic error handling', () => {
        (0, vitest_1.it)('should handle generic errors without exposing sensitive details', () => {
            const error = new Error('Some internal error with sensitive data');
            (0, errorHandler_1.errorHandler)(error, req, res, next);
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(500);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith({
                error: {
                    message: 'An unexpected error occurred',
                    code: 'INTERNAL_ERROR',
                },
            });
        });
    });
    (0, vitest_1.describe)('Helper functions', () => {
        (0, vitest_1.it)('createValidationError should create validation error with details', () => {
            const error = (0, errorHandler_1.createValidationError)({
                email: ['Invalid email format'],
            });
            (0, vitest_1.expect)(error).toBeInstanceOf(errorHandler_1.AppError);
            (0, vitest_1.expect)(error.statusCode).toBe(400);
            (0, vitest_1.expect)(error.code).toBe('VALIDATION_ERROR');
            (0, vitest_1.expect)(error.message).toBe('Validation failed');
            (0, vitest_1.expect)(error.details).toEqual({
                email: ['Invalid email format'],
            });
        });
        (0, vitest_1.it)('createAuthError should create authentication error', () => {
            const error = (0, errorHandler_1.createAuthError)('Invalid credentials');
            (0, vitest_1.expect)(error).toBeInstanceOf(errorHandler_1.AppError);
            (0, vitest_1.expect)(error.statusCode).toBe(401);
            (0, vitest_1.expect)(error.code).toBe('INVALID_CREDENTIALS');
            (0, vitest_1.expect)(error.message).toBe('Invalid credentials');
        });
        (0, vitest_1.it)('createAuthError should use default message', () => {
            const error = (0, errorHandler_1.createAuthError)();
            (0, vitest_1.expect)(error.message).toBe('Invalid credentials');
        });
        (0, vitest_1.it)('createConflictError should create conflict error', () => {
            const error = (0, errorHandler_1.createConflictError)('Email already exists', 'EMAIL_EXISTS');
            (0, vitest_1.expect)(error).toBeInstanceOf(errorHandler_1.AppError);
            (0, vitest_1.expect)(error.statusCode).toBe(409);
            (0, vitest_1.expect)(error.code).toBe('EMAIL_EXISTS');
            (0, vitest_1.expect)(error.message).toBe('Email already exists');
        });
        (0, vitest_1.it)('createConflictError should use default code', () => {
            const error = (0, errorHandler_1.createConflictError)('Resource conflict');
            (0, vitest_1.expect)(error.code).toBe('CONFLICT');
        });
        (0, vitest_1.it)('createNotFoundError should create not found error', () => {
            const error = (0, errorHandler_1.createNotFoundError)('User not found');
            (0, vitest_1.expect)(error).toBeInstanceOf(errorHandler_1.AppError);
            (0, vitest_1.expect)(error.statusCode).toBe(404);
            (0, vitest_1.expect)(error.code).toBe('NOT_FOUND');
            (0, vitest_1.expect)(error.message).toBe('User not found');
        });
        (0, vitest_1.it)('createNotFoundError should use default message', () => {
            const error = (0, errorHandler_1.createNotFoundError)();
            (0, vitest_1.expect)(error.message).toBe('Resource not found');
        });
    });
});
