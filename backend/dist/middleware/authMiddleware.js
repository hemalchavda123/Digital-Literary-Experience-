"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = void 0;
const authMiddleware = (req, res, next) => {
    // Mock authentication for now
    req.user = { id: 'demo-user' };
    next();
};
exports.authMiddleware = authMiddleware;
