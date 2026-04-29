"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const jwtService_1 = require("./jwtService");
(0, vitest_1.describe)('JWTService', () => {
    let jwtService;
    (0, vitest_1.beforeAll)(() => {
        // Set environment variables for testing
        process.env.JWT_ACCESS_SECRET = 'test-access-secret-key-for-unit-testing-purposes-only';
        process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-for-unit-testing-purposes-only';
        jwtService = new jwtService_1.JWTService();
    });
    (0, vitest_1.describe)('generateAccessToken', () => {
        (0, vitest_1.it)('should generate a valid access token with correct payload', () => {
            const payload = {
                userId: '123',
                email: 'test@example.com',
                username: 'testuser'
            };
            const token = jwtService.generateAccessToken(payload);
            (0, vitest_1.expect)(token).toBeDefined();
            (0, vitest_1.expect)(typeof token).toBe('string');
            (0, vitest_1.expect)(token.split('.').length).toBe(3); // JWT has 3 parts
        });
        (0, vitest_1.it)('should include userId, email, and username in token payload', () => {
            const payload = {
                userId: '456',
                email: 'user@test.com',
                username: 'username123'
            };
            const token = jwtService.generateAccessToken(payload);
            const decoded = jwtService.verifyAccessToken(token);
            (0, vitest_1.expect)(decoded).not.toBeNull();
            (0, vitest_1.expect)(decoded?.userId).toBe(payload.userId);
            (0, vitest_1.expect)(decoded?.email).toBe(payload.email);
            (0, vitest_1.expect)(decoded?.username).toBe(payload.username);
        });
    });
    (0, vitest_1.describe)('generateRefreshToken', () => {
        (0, vitest_1.it)('should generate a valid refresh token with correct payload', () => {
            const payload = {
                userId: '789'
            };
            const token = jwtService.generateRefreshToken(payload);
            (0, vitest_1.expect)(token).toBeDefined();
            (0, vitest_1.expect)(typeof token).toBe('string');
            (0, vitest_1.expect)(token.split('.').length).toBe(3);
        });
        (0, vitest_1.it)('should include userId in token payload', () => {
            const payload = {
                userId: '999'
            };
            const token = jwtService.generateRefreshToken(payload);
            const decoded = jwtService.verifyRefreshToken(token);
            (0, vitest_1.expect)(decoded).not.toBeNull();
            (0, vitest_1.expect)(decoded?.userId).toBe(payload.userId);
        });
    });
    (0, vitest_1.describe)('verifyAccessToken', () => {
        (0, vitest_1.it)('should return payload for valid access token', () => {
            const payload = {
                userId: '111',
                email: 'valid@example.com',
                username: 'validuser'
            };
            const token = jwtService.generateAccessToken(payload);
            const decoded = jwtService.verifyAccessToken(token);
            (0, vitest_1.expect)(decoded).not.toBeNull();
            (0, vitest_1.expect)(decoded?.userId).toBe(payload.userId);
            (0, vitest_1.expect)(decoded?.email).toBe(payload.email);
            (0, vitest_1.expect)(decoded?.username).toBe(payload.username);
        });
        (0, vitest_1.it)('should return null for invalid token signature', () => {
            const invalidToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6InRlc3R1c2VyIn0.invalid_signature';
            const decoded = jwtService.verifyAccessToken(invalidToken);
            (0, vitest_1.expect)(decoded).toBeNull();
        });
        (0, vitest_1.it)('should return null for malformed token', () => {
            const malformedToken = 'not.a.valid.jwt.token';
            const decoded = jwtService.verifyAccessToken(malformedToken);
            (0, vitest_1.expect)(decoded).toBeNull();
        });
        (0, vitest_1.it)('should return null for empty token', () => {
            const decoded = jwtService.verifyAccessToken('');
            (0, vitest_1.expect)(decoded).toBeNull();
        });
    });
    (0, vitest_1.describe)('verifyRefreshToken', () => {
        (0, vitest_1.it)('should return payload for valid refresh token', () => {
            const payload = {
                userId: '222'
            };
            const token = jwtService.generateRefreshToken(payload);
            const decoded = jwtService.verifyRefreshToken(token);
            (0, vitest_1.expect)(decoded).not.toBeNull();
            (0, vitest_1.expect)(decoded?.userId).toBe(payload.userId);
        });
        (0, vitest_1.it)('should return null for invalid token signature', () => {
            const invalidToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMifQ.invalid_signature';
            const decoded = jwtService.verifyRefreshToken(invalidToken);
            (0, vitest_1.expect)(decoded).toBeNull();
        });
        (0, vitest_1.it)('should return null for malformed token', () => {
            const malformedToken = 'not.a.valid.jwt';
            const decoded = jwtService.verifyRefreshToken(malformedToken);
            (0, vitest_1.expect)(decoded).toBeNull();
        });
    });
    (0, vitest_1.describe)('token expiration', () => {
        (0, vitest_1.it)('should verify access token is valid immediately after generation', () => {
            const payload = {
                userId: '333',
                email: 'expire@test.com',
                username: 'expireuser'
            };
            const token = jwtService.generateAccessToken(payload);
            const decoded = jwtService.verifyAccessToken(token);
            (0, vitest_1.expect)(decoded).not.toBeNull();
        });
        (0, vitest_1.it)('should verify refresh token is valid immediately after generation', () => {
            const payload = {
                userId: '444'
            };
            const token = jwtService.generateRefreshToken(payload);
            const decoded = jwtService.verifyRefreshToken(token);
            (0, vitest_1.expect)(decoded).not.toBeNull();
        });
    });
    (0, vitest_1.describe)('constructor', () => {
        (0, vitest_1.it)('should throw error if JWT_ACCESS_SECRET is not defined', () => {
            const originalAccessSecret = process.env.JWT_ACCESS_SECRET;
            delete process.env.JWT_ACCESS_SECRET;
            (0, vitest_1.expect)(() => new jwtService_1.JWTService()).toThrow('JWT secrets must be defined in environment variables');
            process.env.JWT_ACCESS_SECRET = originalAccessSecret;
        });
        (0, vitest_1.it)('should throw error if JWT_REFRESH_SECRET is not defined', () => {
            const originalRefreshSecret = process.env.JWT_REFRESH_SECRET;
            delete process.env.JWT_REFRESH_SECRET;
            (0, vitest_1.expect)(() => new jwtService_1.JWTService()).toThrow('JWT secrets must be defined in environment variables');
            process.env.JWT_REFRESH_SECRET = originalRefreshSecret;
        });
    });
});
