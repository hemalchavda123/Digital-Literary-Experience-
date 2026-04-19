import { describe, it, expect, beforeAll } from 'vitest';
import { JWTService, TokenPayload, RefreshPayload } from './jwtService';

describe('JWTService', () => {
  let jwtService: JWTService;

  beforeAll(() => {
    // Set environment variables for testing
    process.env.JWT_ACCESS_SECRET = 'test-access-secret-key-for-unit-testing-purposes-only';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-for-unit-testing-purposes-only';
    jwtService = new JWTService();
  });

  describe('generateAccessToken', () => {
    it('should generate a valid access token with correct payload', () => {
      const payload: TokenPayload = {
        userId: '123',
        email: 'test@example.com',
        username: 'testuser'
      };

      const token = jwtService.generateAccessToken(payload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3); // JWT has 3 parts
    });

    it('should include userId, email, and username in token payload', () => {
      const payload: TokenPayload = {
        userId: '456',
        email: 'user@test.com',
        username: 'username123'
      };

      const token = jwtService.generateAccessToken(payload);
      const decoded = jwtService.verifyAccessToken(token);

      expect(decoded).not.toBeNull();
      expect(decoded?.userId).toBe(payload.userId);
      expect(decoded?.email).toBe(payload.email);
      expect(decoded?.username).toBe(payload.username);
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a valid refresh token with correct payload', () => {
      const payload: RefreshPayload = {
        userId: '789'
      };

      const token = jwtService.generateRefreshToken(payload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3);
    });

    it('should include userId in token payload', () => {
      const payload: RefreshPayload = {
        userId: '999'
      };

      const token = jwtService.generateRefreshToken(payload);
      const decoded = jwtService.verifyRefreshToken(token);

      expect(decoded).not.toBeNull();
      expect(decoded?.userId).toBe(payload.userId);
    });
  });

  describe('verifyAccessToken', () => {
    it('should return payload for valid access token', () => {
      const payload: TokenPayload = {
        userId: '111',
        email: 'valid@example.com',
        username: 'validuser'
      };

      const token = jwtService.generateAccessToken(payload);
      const decoded = jwtService.verifyAccessToken(token);

      expect(decoded).not.toBeNull();
      expect(decoded?.userId).toBe(payload.userId);
      expect(decoded?.email).toBe(payload.email);
      expect(decoded?.username).toBe(payload.username);
    });

    it('should return null for invalid token signature', () => {
      const invalidToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6InRlc3R1c2VyIn0.invalid_signature';

      const decoded = jwtService.verifyAccessToken(invalidToken);

      expect(decoded).toBeNull();
    });

    it('should return null for malformed token', () => {
      const malformedToken = 'not.a.valid.jwt.token';

      const decoded = jwtService.verifyAccessToken(malformedToken);

      expect(decoded).toBeNull();
    });

    it('should return null for empty token', () => {
      const decoded = jwtService.verifyAccessToken('');

      expect(decoded).toBeNull();
    });
  });

  describe('verifyRefreshToken', () => {
    it('should return payload for valid refresh token', () => {
      const payload: RefreshPayload = {
        userId: '222'
      };

      const token = jwtService.generateRefreshToken(payload);
      const decoded = jwtService.verifyRefreshToken(token);

      expect(decoded).not.toBeNull();
      expect(decoded?.userId).toBe(payload.userId);
    });

    it('should return null for invalid token signature', () => {
      const invalidToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMifQ.invalid_signature';

      const decoded = jwtService.verifyRefreshToken(invalidToken);

      expect(decoded).toBeNull();
    });

    it('should return null for malformed token', () => {
      const malformedToken = 'not.a.valid.jwt';

      const decoded = jwtService.verifyRefreshToken(malformedToken);

      expect(decoded).toBeNull();
    });
  });

  describe('token expiration', () => {
    it('should verify access token is valid immediately after generation', () => {
      const payload: TokenPayload = {
        userId: '333',
        email: 'expire@test.com',
        username: 'expireuser'
      };

      const token = jwtService.generateAccessToken(payload);
      const decoded = jwtService.verifyAccessToken(token);

      expect(decoded).not.toBeNull();
    });

    it('should verify refresh token is valid immediately after generation', () => {
      const payload: RefreshPayload = {
        userId: '444'
      };

      const token = jwtService.generateRefreshToken(payload);
      const decoded = jwtService.verifyRefreshToken(token);

      expect(decoded).not.toBeNull();
    });
  });

  describe('constructor', () => {
    it('should throw error if JWT_ACCESS_SECRET is not defined', () => {
      const originalAccessSecret = process.env.JWT_ACCESS_SECRET;
      delete process.env.JWT_ACCESS_SECRET;

      expect(() => new JWTService()).toThrow('JWT secrets must be defined in environment variables');

      process.env.JWT_ACCESS_SECRET = originalAccessSecret;
    });

    it('should throw error if JWT_REFRESH_SECRET is not defined', () => {
      const originalRefreshSecret = process.env.JWT_REFRESH_SECRET;
      delete process.env.JWT_REFRESH_SECRET;

      expect(() => new JWTService()).toThrow('JWT secrets must be defined in environment variables');

      process.env.JWT_REFRESH_SECRET = originalRefreshSecret;
    });
  });
});
