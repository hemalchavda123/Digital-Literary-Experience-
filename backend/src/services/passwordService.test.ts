import { describe, it, expect } from 'vitest';
import passwordService from './passwordService';

describe('PasswordService', () => {
  describe('hashPassword', () => {
    it('should hash a password and produce a valid bcrypt hash', async () => {
      const password = 'testPassword123';
      const hash = await passwordService.hashPassword(password);
      
      // Bcrypt hashes start with $2a$, $2b$, or $2y$ followed by cost factor
      expect(hash).toMatch(/^\$2[aby]\$\d{2}\$/);
      expect(hash.length).toBeGreaterThan(50);
    });

    it('should produce different hashes for the same password', async () => {
      const password = 'testPassword123';
      const hash1 = await passwordService.hashPassword(password);
      const hash2 = await passwordService.hashPassword(password);
      
      // Due to random salt, hashes should be different
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('comparePassword', () => {
    it('should return true for matching password', async () => {
      const password = 'testPassword123';
      const hash = await passwordService.hashPassword(password);
      
      const result = await passwordService.comparePassword(password, hash);
      expect(result).toBe(true);
    });

    it('should return false for non-matching password', async () => {
      const password = 'testPassword123';
      const wrongPassword = 'wrongPassword456';
      const hash = await passwordService.hashPassword(password);
      
      const result = await passwordService.comparePassword(wrongPassword, hash);
      expect(result).toBe(false);
    });
  });

  describe('generateResetToken', () => {
    it('should generate a 64-character hexadecimal string', () => {
      const token = passwordService.generateResetToken();
      
      expect(token).toHaveLength(64);
      expect(token).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should generate unique tokens', () => {
      const token1 = passwordService.generateResetToken();
      const token2 = passwordService.generateResetToken();
      
      expect(token1).not.toBe(token2);
    });
  });

  describe('hashResetToken', () => {
    it('should produce a consistent SHA-256 hash', () => {
      const token = 'test-reset-token';
      const hash1 = passwordService.hashResetToken(token);
      const hash2 = passwordService.hashResetToken(token);
      
      // Same input should produce same hash
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 produces 64 hex characters
      expect(hash1).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should produce different hashes for different tokens', () => {
      const token1 = 'test-reset-token-1';
      const token2 = 'test-reset-token-2';
      
      const hash1 = passwordService.hashResetToken(token1);
      const hash2 = passwordService.hashResetToken(token2);
      
      expect(hash1).not.toBe(hash2);
    });
  });
});
