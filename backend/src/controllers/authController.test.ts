import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Request, Response } from 'express';
import { register, login, refresh, logout, forgotPassword, resetPassword, getCurrentUser } from './authController';
import userService from '../services/userService';
import passwordService from '../services/passwordService';
import { jwtService } from '../services/jwtService';

// Mock dependencies
vi.mock('../services/userService');
vi.mock('../services/passwordService');
vi.mock('../services/jwtService');

describe('AuthController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let jsonMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    jsonMock = vi.fn();
    statusMock = vi.fn().mockReturnValue({ json: jsonMock });
    
    mockRequest = {
      body: {},
      user: undefined,
    };
    
    mockResponse = {
      json: jsonMock,
      status: statusMock,
    };

    vi.clearAllMocks();
  });

  describe('register', () => {
    it('should create a new user with valid input', async () => {
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        username: 'testuser',
        createdAt: new Date(),
        updatedAt: new Date(),
        resetToken: null,
        resetTokenExpiry: null,
      };

      mockRequest.body = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123',
      };

      vi.mocked(userService.findUserByEmail).mockResolvedValue(null);
      vi.mocked(userService.findUserByUsername).mockResolvedValue(null);
      vi.mocked(passwordService.hashPassword).mockResolvedValue('hashedPassword');
      vi.mocked(userService.createUser).mockResolvedValue(mockUser);

      await register(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith(mockUser);
    });

    it('should return 400 for missing fields', async () => {
      mockRequest.body = { email: 'test@example.com' };

      await register(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
          }),
        })
      );
    });

    it('should return 400 for invalid email format', async () => {
      mockRequest.body = {
        email: 'invalid-email',
        username: 'testuser',
        password: 'password123',
      };

      await register(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
            details: expect.objectContaining({
              email: expect.arrayContaining(['Invalid email format']),
            }),
          }),
        })
      );
    });

    it('should return 400 for short password', async () => {
      mockRequest.body = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'short',
      };

      await register(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
            details: expect.objectContaining({
              password: expect.arrayContaining(['Password must be at least 8 characters']),
            }),
          }),
        })
      );
    });

    it('should return 409 for existing email', async () => {
      mockRequest.body = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123',
      };

      vi.mocked(userService.findUserByEmail).mockResolvedValue({ id: '123' } as any);

      await register(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(409);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'EMAIL_EXISTS',
          }),
        })
      );
    });

    it('should return 409 for existing username', async () => {
      mockRequest.body = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123',
      };

      vi.mocked(userService.findUserByEmail).mockResolvedValue(null);
      vi.mocked(userService.findUserByUsername).mockResolvedValue({ id: '123' } as any);

      await register(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(409);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'USERNAME_EXISTS',
          }),
        })
      );
    });
  });

  describe('login', () => {
    it('should return tokens and user data for valid credentials', async () => {
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        username: 'testuser',
        password: 'hashedPassword',
        createdAt: new Date(),
        updatedAt: new Date(),
        resetToken: null,
        resetTokenExpiry: null,
      };

      mockRequest.body = {
        email: 'test@example.com',
        password: 'password123',
      };

      const mockJwtService = {
        generateAccessToken: vi.fn().mockReturnValue('accessToken'),
        generateRefreshToken: vi.fn().mockReturnValue('refreshToken'),
      };

      vi.mocked(userService.findUserByEmail).mockResolvedValue(mockUser);
      vi.mocked(passwordService.comparePassword).mockResolvedValue(true);
      vi.mocked(jwtService).mockReturnValue(mockJwtService as any);

      await login(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          accessToken: 'accessToken',
          refreshToken: 'refreshToken',
          user: expect.objectContaining({
            id: '123',
            email: 'test@example.com',
            username: 'testuser',
          }),
        })
      );
      expect(jsonMock.mock.calls[0][0].user).not.toHaveProperty('password');
    });

    it('should return 401 for invalid email', async () => {
      mockRequest.body = {
        email: 'test@example.com',
        password: 'password123',
      };

      vi.mocked(userService.findUserByEmail).mockResolvedValue(null);

      await login(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'INVALID_CREDENTIALS',
          }),
        })
      );
    });

    it('should return 401 for invalid password', async () => {
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        username: 'testuser',
        password: 'hashedPassword',
        createdAt: new Date(),
        updatedAt: new Date(),
        resetToken: null,
        resetTokenExpiry: null,
      };

      mockRequest.body = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      vi.mocked(userService.findUserByEmail).mockResolvedValue(mockUser);
      vi.mocked(passwordService.comparePassword).mockResolvedValue(false);

      await login(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'INVALID_CREDENTIALS',
          }),
        })
      );
    });
  });

  describe('refresh', () => {
    it('should return new access token for valid refresh token', async () => {
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        username: 'testuser',
        createdAt: new Date(),
        updatedAt: new Date(),
        resetToken: null,
        resetTokenExpiry: null,
      };

      mockRequest.body = {
        refreshToken: 'validRefreshToken',
      };

      const mockJwtService = {
        verifyRefreshToken: vi.fn().mockReturnValue({ userId: '123' }),
        generateAccessToken: vi.fn().mockReturnValue('newAccessToken'),
      };

      vi.mocked(jwtService).mockReturnValue(mockJwtService as any);
      vi.mocked(userService.findUserById).mockResolvedValue(mockUser);

      await refresh(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          accessToken: 'newAccessToken',
        })
      );
    });

    it('should return 401 for invalid refresh token', async () => {
      mockRequest.body = {
        refreshToken: 'invalidToken',
      };

      const mockJwtService = {
        verifyRefreshToken: vi.fn().mockReturnValue(null),
      };

      vi.mocked(jwtService).mockReturnValue(mockJwtService as any);

      await refresh(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'INVALID_TOKEN',
          }),
        })
      );
    });
  });

  describe('logout', () => {
    it('should return success message', async () => {
      await logout(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({ message: 'Logout successful' });
    });
  });

  describe('forgotPassword', () => {
    it('should generate and store reset token for valid email', async () => {
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        username: 'testuser',
        password: 'hashedPassword',
        createdAt: new Date(),
        updatedAt: new Date(),
        resetToken: null,
        resetTokenExpiry: null,
      };

      mockRequest.body = {
        email: 'test@example.com',
      };

      vi.mocked(userService.findUserByEmail).mockResolvedValue(mockUser);
      vi.mocked(passwordService.generateResetToken).mockReturnValue('resetToken123');
      vi.mocked(passwordService.hashResetToken).mockReturnValue('hashedResetToken');
      vi.mocked(userService.setResetToken).mockResolvedValue(mockUser as any);

      await forgotPassword(mockRequest as Request, mockResponse as Response);

      expect(userService.setResetToken).toHaveBeenCalledWith(
        '123',
        'hashedResetToken',
        expect.any(Date)
      );
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('password reset link'),
        })
      );
    });

    it('should return success message even for non-existent email', async () => {
      mockRequest.body = {
        email: 'nonexistent@example.com',
      };

      vi.mocked(userService.findUserByEmail).mockResolvedValue(null);

      await forgotPassword(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('password reset link'),
        })
      );
    });
  });

  describe('resetPassword', () => {
    it('should update password for valid reset token', async () => {
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        username: 'testuser',
        password: 'oldHashedPassword',
        createdAt: new Date(),
        updatedAt: new Date(),
        resetToken: 'hashedResetToken',
        resetTokenExpiry: new Date(Date.now() + 3600000),
      };

      mockRequest.body = {
        token: 'a'.repeat(64), // 64-character token
        password: 'newPassword123',
      };

      vi.mocked(passwordService.hashResetToken).mockReturnValue('hashedResetToken');
      vi.mocked(userService.findUserByResetToken).mockResolvedValue(mockUser);
      vi.mocked(passwordService.hashPassword).mockResolvedValue('newHashedPassword');
      vi.mocked(userService.updatePassword).mockResolvedValue(mockUser as any);
      vi.mocked(userService.clearResetToken).mockResolvedValue(mockUser as any);

      await resetPassword(mockRequest as Request, mockResponse as Response);

      expect(userService.updatePassword).toHaveBeenCalledWith('123', 'newHashedPassword');
      expect(userService.clearResetToken).toHaveBeenCalledWith('123');
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Password reset successful',
        })
      );
    });

    it('should return 401 for invalid reset token', async () => {
      mockRequest.body = {
        token: 'a'.repeat(64),
        password: 'newPassword123',
      };

      vi.mocked(passwordService.hashResetToken).mockReturnValue('hashedResetToken');
      vi.mocked(userService.findUserByResetToken).mockResolvedValue(null);

      await resetPassword(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'INVALID_TOKEN',
          }),
        })
      );
    });
  });

  describe('getCurrentUser', () => {
    it('should return user data for authenticated user', async () => {
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        username: 'testuser',
        createdAt: new Date(),
        updatedAt: new Date(),
        resetToken: null,
        resetTokenExpiry: null,
      };

      mockRequest.user = {
        userId: '123',
        email: 'test@example.com',
        username: 'testuser',
      };

      vi.mocked(userService.findUserById).mockResolvedValue(mockUser);

      await getCurrentUser(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith(mockUser);
    });

    it('should return 401 for unauthenticated request', async () => {
      mockRequest.user = undefined;

      await getCurrentUser(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'NOT_AUTHENTICATED',
          }),
        })
      );
    });
  });
});
