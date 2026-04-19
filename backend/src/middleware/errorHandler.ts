import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';

/**
 * Error Handler Middleware
 * 
 * This module provides centralized error handling for the Express application.
 * It handles validation errors, authentication errors, conflict errors, database errors,
 * and generic errors with consistent error response format.
 * 
 * Usage:
 * 1. Import the errorHandler middleware in your Express app
 * 2. Add it as the last middleware after all routes:
 *    ```
 *    import { errorHandler } from './middleware/errorHandler';
 *    
 *    // ... routes ...
 *    
 *    app.use(errorHandler);
 *    ```
 * 
 * 3. In controllers, throw AppError or use helper functions:
 *    ```
 *    import { createValidationError, createAuthError, createConflictError } from './middleware/errorHandler';
 *    
 *    // Validation error
 *    throw createValidationError({ email: ['Invalid email format'] });
 *    
 *    // Authentication error
 *    throw createAuthError('Invalid credentials');
 *    
 *    // Conflict error
 *    throw createConflictError('Email already registered', 'EMAIL_EXISTS');
 *    ```
 * 
 * 4. Or use async error handling with try-catch:
 *    ```
 *    try {
 *      // ... code that might throw ...
 *    } catch (error) {
 *      next(error); // Pass error to error handler
 *    }
 *    ```
 * 
 * Validates Requirements: 7.2, 7.3, 7.4, 7.5
 */

/**
 * Error response format interface
 * Validates Requirements: 7.2, 7.3, 7.4, 7.5
 */
interface ErrorResponse {
  error: {
    message: string;
    code: string;
    details?: Record<string, string[]>;
  };
}

/**
 * Custom error class for application-specific errors
 */
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: Record<string, string[]>
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

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
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Log error for debugging (in production, use proper logging service)
  console.error('Error:', {
    name: err.name,
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  // Handle custom AppError
  if (err instanceof AppError) {
    const response: ErrorResponse = {
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
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    handlePrismaError(err, res);
    return;
  }

  // Handle Prisma validation errors
  if (err instanceof Prisma.PrismaClientValidationError) {
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

/**
 * Handle Prisma-specific database errors
 * Maps Prisma error codes to appropriate HTTP responses
 * 
 * Validates Requirements: 7.3, 7.4, 7.5
 */
function handlePrismaError(
  err: Prisma.PrismaClientKnownRequestError,
  res: Response
): void {
  switch (err.code) {
    // Unique constraint violation
    case 'P2002': {
      const target = err.meta?.target as string[] | undefined;
      const field = target?.[0] || 'field';
      
      // Map field names to user-friendly messages
      let message = 'Resource already exists';
      let code = 'CONFLICT';
      
      if (field === 'email') {
        message = 'Email already registered';
        code = 'EMAIL_EXISTS';
      } else if (field === 'username') {
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
export function createValidationError(
  details: Record<string, string[]>
): AppError {
  return new AppError(400, 'VALIDATION_ERROR', 'Validation failed', details);
}

/**
 * Helper function to create authentication errors
 * Used by controllers to throw authentication errors
 */
export function createAuthError(message: string = 'Invalid credentials'): AppError {
  return new AppError(401, 'INVALID_CREDENTIALS', message);
}

/**
 * Helper function to create conflict errors
 * Used by controllers to throw conflict errors
 */
export function createConflictError(
  message: string,
  code: string = 'CONFLICT'
): AppError {
  return new AppError(409, code, message);
}

/**
 * Helper function to create not found errors
 */
export function createNotFoundError(message: string = 'Resource not found'): AppError {
  return new AppError(404, 'NOT_FOUND', message);
}
