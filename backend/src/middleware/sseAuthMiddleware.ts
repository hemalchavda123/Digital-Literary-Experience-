import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

/**
 * SSE-friendly auth: EventSource can't set Authorization headers easily, so we accept
 * a short-lived, doc-scoped stream token via `?token=...`.
 */
export const sseAuthMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const token = typeof req.query.token === 'string' ? req.query.token : null;
    if (!token) {
      res.status(401).json({
        error: { message: 'Invalid or missing token', code: 'INVALID_TOKEN' },
      });
      return;
    }

    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) {
      res.status(500).json({ error: { message: 'JWT secret not configured', code: 'SERVER_ERROR' } });
      return;
    }

    const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] }) as any;
    if (!decoded || decoded.typ !== 'annotation_stream') {
      res.status(401).json({
        error: { message: 'Invalid or missing token', code: 'INVALID_TOKEN' },
      });
      return;
    }

    const docId = req.params.docId as string | undefined;
    if (!docId || decoded.docId !== docId) {
      res.status(403).json({
        error: { message: 'Not authorized for document', code: 'FORBIDDEN' },
      });
      return;
    }

    req.user = {
      userId: decoded.userId,
      email: decoded.email || '',
      username: decoded.username || '',
    };

    next();
  } catch {
    res.status(401).json({
      error: { message: 'Invalid or missing token', code: 'INVALID_TOKEN' },
    });
  }
};

