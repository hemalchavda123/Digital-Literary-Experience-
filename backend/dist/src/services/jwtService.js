"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.jwtService = exports.JWTService = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
class JWTService {
    constructor() {
        this.accessSecret = process.env.JWT_ACCESS_SECRET || '';
        this.refreshSecret = process.env.JWT_REFRESH_SECRET || '';
        if (!this.accessSecret || !this.refreshSecret) {
            throw new Error('JWT secrets must be defined in environment variables');
        }
    }
    /**
     * Generates an access token with 15-minute expiration
     * @param payload - Token payload containing userId, email, and username
     * @returns Signed JWT access token
     */
    generateAccessToken(payload) {
        return jsonwebtoken_1.default.sign(payload, this.accessSecret, {
            expiresIn: '15m',
            algorithm: 'HS256'
        });
    }
    /**
     * Generates a refresh token with 7-day expiration
     * @param payload - Token payload containing userId
     * @returns Signed JWT refresh token
     */
    generateRefreshToken(payload) {
        return jsonwebtoken_1.default.sign(payload, this.refreshSecret, {
            expiresIn: '7d',
            algorithm: 'HS256'
        });
    }
    /**
     * Verifies and decodes an access token
     * @param token - JWT access token to verify
     * @returns Decoded token payload or null if invalid/expired
     */
    verifyAccessToken(token) {
        try {
            const decoded = jsonwebtoken_1.default.verify(token, this.accessSecret, {
                algorithms: ['HS256']
            });
            return decoded;
        }
        catch (error) {
            return null;
        }
    }
    /**
     * Verifies and decodes a refresh token
     * @param token - JWT refresh token to verify
     * @returns Decoded token payload or null if invalid/expired
     */
    verifyRefreshToken(token) {
        try {
            const decoded = jsonwebtoken_1.default.verify(token, this.refreshSecret, {
                algorithms: ['HS256']
            });
            return decoded;
        }
        catch (error) {
            return null;
        }
    }
}
exports.JWTService = JWTService;
// Lazy singleton instance
let jwtServiceInstance = null;
const jwtService = () => {
    if (!jwtServiceInstance) {
        jwtServiceInstance = new JWTService();
    }
    return jwtServiceInstance;
};
exports.jwtService = jwtService;
