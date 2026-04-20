"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sseAuthMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
/**
 * SSE-friendly auth: EventSource can't set Authorization headers easily, so we accept
 * a short-lived, doc-scoped stream token via `?token=...`.
 */
const sseAuthMiddleware = (req, res, next) => {
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
        const decoded = jsonwebtoken_1.default.verify(token, secret, { algorithms: ['HS256'] });
        if (!decoded || decoded.typ !== 'annotation_stream') {
            res.status(401).json({
                error: { message: 'Invalid or missing token', code: 'INVALID_TOKEN' },
            });
            return;
        }
        const docId = req.params.docId;
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
    }
    catch {
        res.status(401).json({
            error: { message: 'Invalid or missing token', code: 'INVALID_TOKEN' },
        });
    }
};
exports.sseAuthMiddleware = sseAuthMiddleware;
