"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const passwordService_1 = __importDefault(require("./passwordService"));
(0, vitest_1.describe)('PasswordService', () => {
    (0, vitest_1.describe)('hashPassword', () => {
        (0, vitest_1.it)('should hash a password and produce a valid bcrypt hash', async () => {
            const password = 'testPassword123';
            const hash = await passwordService_1.default.hashPassword(password);
            // Bcrypt hashes start with $2a$, $2b$, or $2y$ followed by cost factor
            (0, vitest_1.expect)(hash).toMatch(/^\$2[aby]\$\d{2}\$/);
            (0, vitest_1.expect)(hash.length).toBeGreaterThan(50);
        });
        (0, vitest_1.it)('should produce different hashes for the same password', async () => {
            const password = 'testPassword123';
            const hash1 = await passwordService_1.default.hashPassword(password);
            const hash2 = await passwordService_1.default.hashPassword(password);
            // Due to random salt, hashes should be different
            (0, vitest_1.expect)(hash1).not.toBe(hash2);
        });
    });
    (0, vitest_1.describe)('comparePassword', () => {
        (0, vitest_1.it)('should return true for matching password', async () => {
            const password = 'testPassword123';
            const hash = await passwordService_1.default.hashPassword(password);
            const result = await passwordService_1.default.comparePassword(password, hash);
            (0, vitest_1.expect)(result).toBe(true);
        });
        (0, vitest_1.it)('should return false for non-matching password', async () => {
            const password = 'testPassword123';
            const wrongPassword = 'wrongPassword456';
            const hash = await passwordService_1.default.hashPassword(password);
            const result = await passwordService_1.default.comparePassword(wrongPassword, hash);
            (0, vitest_1.expect)(result).toBe(false);
        });
    });
    (0, vitest_1.describe)('generateResetToken', () => {
        (0, vitest_1.it)('should generate a 64-character hexadecimal string', () => {
            const token = passwordService_1.default.generateResetToken();
            (0, vitest_1.expect)(token).toHaveLength(64);
            (0, vitest_1.expect)(token).toMatch(/^[0-9a-f]{64}$/);
        });
        (0, vitest_1.it)('should generate unique tokens', () => {
            const token1 = passwordService_1.default.generateResetToken();
            const token2 = passwordService_1.default.generateResetToken();
            (0, vitest_1.expect)(token1).not.toBe(token2);
        });
    });
    (0, vitest_1.describe)('hashResetToken', () => {
        (0, vitest_1.it)('should produce a consistent SHA-256 hash', () => {
            const token = 'test-reset-token';
            const hash1 = passwordService_1.default.hashResetToken(token);
            const hash2 = passwordService_1.default.hashResetToken(token);
            // Same input should produce same hash
            (0, vitest_1.expect)(hash1).toBe(hash2);
            (0, vitest_1.expect)(hash1).toHaveLength(64); // SHA-256 produces 64 hex characters
            (0, vitest_1.expect)(hash1).toMatch(/^[0-9a-f]{64}$/);
        });
        (0, vitest_1.it)('should produce different hashes for different tokens', () => {
            const token1 = 'test-reset-token-1';
            const token2 = 'test-reset-token-2';
            const hash1 = passwordService_1.default.hashResetToken(token1);
            const hash2 = passwordService_1.default.hashResetToken(token2);
            (0, vitest_1.expect)(hash1).not.toBe(hash2);
        });
    });
});
