import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import {
  errorHandler,
  AppError,
  createValidationError,
  createAuthError,
  createConflictError,
  createNotFoundError,
} from './errorHandler';

describe('Error Handler Middleware', () => {
  let req: Request;
  let res: Response;
  let next: NextFunction;

  beforeEach(() => {
    req = {} as Request;
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as unknown as Response;
    next = vi.fn();
    
    // Mock console.error to avoid cluttering test output
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('AppError handling', () => {
    it('should handle validation errors (400) with field-specific messages', () => {
      const error = new AppError(
        400,
        'VALIDATION_ERROR',
        'Validation failed',
        {
          email: ['Invalid email format'],
          password: ['Password must be at least 8 characters'],
        }
      );

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
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

    it('should handle authentication errors (401) with generic messages', () => {
      const error = new AppError(401, 'INVALID_CREDENTIALS', 'Invalid credentials');

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          message: 'Invalid credentials',
          code: 'INVALID_CREDENTIALS',
        },
      });
    });

    it('should handle conflict errors (409) for duplicate resources', () => {
      const error = new AppError(409, 'EMAIL_EXISTS', 'Email already registered');

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          message: 'Email already registered',
          code: 'EMAIL_EXISTS',
        },
      });
    });

    it('should handle not found errors (404)', () => {
      const error = new AppError(404, 'NOT_FOUND', 'Resource not found');

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          message: 'Resource not found',
          code: 'NOT_FOUND',
        },
      });
    });
  });

  describe('Prisma error handling', () => {
    it('should handle unique constraint violation (P2002) for email', () => {
      const error = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          clientVersion: '5.0.0',
          meta: { target: ['email'] },
        }
      );

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          message: 'Email already registered',
          code: 'EMAIL_EXISTS',
        },
      });
    });

    it('should handle unique constraint violation (P2002) for username', () => {
      const error = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          clientVersion: '5.0.0',
          meta: { target: ['username'] },
        }
      );

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          message: 'Username already taken',
          code: 'USERNAME_EXISTS',
        },
      });
    });

    it('should handle record not found (P2025)', () => {
      const error = new Prisma.PrismaClientKnownRequestError(
        'Record not found',
        {
          code: 'P2025',
          clientVersion: '5.0.0',
        }
      );

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          message: 'Resource not found',
          code: 'NOT_FOUND',
        },
      });
    });

    it('should handle foreign key constraint violation (P2003)', () => {
      const error = new Prisma.PrismaClientKnownRequestError(
        'Foreign key constraint failed',
        {
          code: 'P2003',
          clientVersion: '5.0.0',
        }
      );

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          message: 'Invalid reference to related resource',
          code: 'INVALID_REFERENCE',
        },
      });
    });

    it('should handle database connection errors (P1001)', () => {
      const error = new Prisma.PrismaClientKnownRequestError(
        'Connection error',
        {
          code: 'P1001',
          clientVersion: '5.0.0',
        }
      );

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          message: 'Database connection error',
          code: 'DATABASE_ERROR',
        },
      });
    });

    it('should handle unknown Prisma errors without exposing sensitive details', () => {
      const error = new Prisma.PrismaClientKnownRequestError(
        'Unknown error',
        {
          code: 'P9999',
          clientVersion: '5.0.0',
        }
      );

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          message: 'An unexpected error occurred',
          code: 'INTERNAL_ERROR',
        },
      });
    });
  });

  describe('Prisma validation error handling', () => {
    it('should handle Prisma validation errors', () => {
      const error = new Prisma.PrismaClientValidationError(
        'Validation error',
        { clientVersion: '5.0.0' }
      );

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          message: 'Invalid data provided',
          code: 'VALIDATION_ERROR',
        },
      });
    });
  });

  describe('JWT error handling', () => {
    it('should handle JsonWebTokenError', () => {
      const error = new Error('Invalid token');
      error.name = 'JsonWebTokenError';

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          message: 'Invalid or missing token',
          code: 'INVALID_TOKEN',
        },
      });
    });

    it('should handle TokenExpiredError', () => {
      const error = new Error('Token expired');
      error.name = 'TokenExpiredError';

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          message: 'Token expired',
          code: 'TOKEN_EXPIRED',
        },
      });
    });
  });

  describe('Generic error handling', () => {
    it('should handle generic errors without exposing sensitive details', () => {
      const error = new Error('Some internal error with sensitive data');

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          message: 'An unexpected error occurred',
          code: 'INTERNAL_ERROR',
        },
      });
    });
  });

  describe('Helper functions', () => {
    it('createValidationError should create validation error with details', () => {
      const error = createValidationError({
        email: ['Invalid email format'],
      });

      expect(error).toBeInstanceOf(AppError);
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.message).toBe('Validation failed');
      expect(error.details).toEqual({
        email: ['Invalid email format'],
      });
    });

    it('createAuthError should create authentication error', () => {
      const error = createAuthError('Invalid credentials');

      expect(error).toBeInstanceOf(AppError);
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('INVALID_CREDENTIALS');
      expect(error.message).toBe('Invalid credentials');
    });

    it('createAuthError should use default message', () => {
      const error = createAuthError();

      expect(error.message).toBe('Invalid credentials');
    });

    it('createConflictError should create conflict error', () => {
      const error = createConflictError('Email already exists', 'EMAIL_EXISTS');

      expect(error).toBeInstanceOf(AppError);
      expect(error.statusCode).toBe(409);
      expect(error.code).toBe('EMAIL_EXISTS');
      expect(error.message).toBe('Email already exists');
    });

    it('createConflictError should use default code', () => {
      const error = createConflictError('Resource conflict');

      expect(error.code).toBe('CONFLICT');
    });

    it('createNotFoundError should create not found error', () => {
      const error = createNotFoundError('User not found');

      expect(error).toBeInstanceOf(AppError);
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
      expect(error.message).toBe('User not found');
    });

    it('createNotFoundError should use default message', () => {
      const error = createNotFoundError();

      expect(error.message).toBe('Resource not found');
    });
  });
});
