import { Request, Response, NextFunction } from 'express';
import { jwtService, TokenPayload } from '../services/jwtService';

// Extend Express Request type to include user property
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        username: string;
      };
    }
  }
}

/**
 * Authentication middleware that verifies JWT tokens
 * Extracts token from Authorization header, verifies it, and attaches user to request
 */
export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract Authorization header
    const authHeader = req.headers.authorization;

    // Check if Authorization header is present
    if (!authHeader) {
      res.status(401).json({
        error: {
          message: 'Invalid or missing token',
          code: 'INVALID_TOKEN'
        }
      });
      return;
    }

    // Check if Authorization header follows Bearer format
    if (!authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: {
          message: 'Invalid or missing token',
          code: 'INVALID_TOKEN'
        }
      });
      return;
    }

    // Extract token from Bearer format
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token using JWTService
    const jwt = jwtService();
    const decoded = jwt.verifyAccessToken(token);

    // Check if token is valid
    if (!decoded) {
      res.status(401).json({
        error: {
          message: 'Invalid or missing token',
          code: 'INVALID_TOKEN'
        }
      });
      return;
    }

    // Attach decoded user payload to req.user
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      username: decoded.username
    };

    // Call next() to proceed to route handler
    next();
  } catch (error) {
    // Handle any unexpected errors
    res.status(401).json({
      error: {
        message: 'Invalid or missing token',
        code: 'INVALID_TOKEN'
      }
    });
  }
};
