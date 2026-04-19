"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = void 0;
const jwtService_1 = require("../services/jwtService");
/**
 * Authentication middleware that verifies JWT tokens
 * Extracts token from Authorization header, verifies it, and attaches user to request
 */
const authMiddleware = async (req, res, next) => {
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
        const jwt = (0, jwtService_1.jwtService)();
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
    }
    catch (error) {
        // Handle any unexpected errors
        res.status(401).json({
            error: {
                message: 'Invalid or missing token',
                code: 'INVALID_TOKEN'
            }
        });
    }
};
exports.authMiddleware = authMiddleware;
