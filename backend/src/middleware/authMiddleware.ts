import { Request, Response, NextFunction } from 'express';

// Extend express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Mock authentication for now
  req.user = { id: 'demo-user' };
  next();
};
