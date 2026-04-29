"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const authController_1 = require("./authController");
const userService_1 = __importDefault(require("../services/userService"));
const passwordService_1 = __importDefault(require("../services/passwordService"));
const jwtService_1 = require("../services/jwtService");
// Mock dependencies
vitest_1.vi.mock('../services/userService');
vitest_1.vi.mock('../services/passwordService');
vitest_1.vi.mock('../services/jwtService');
(0, vitest_1.describe)('AuthController', () => {
    let mockRequest;
    let mockResponse;
    let jsonMock;
    let statusMock;
    (0, vitest_1.beforeEach)(() => {
        jsonMock = vitest_1.vi.fn();
        statusMock = vitest_1.vi.fn().mockReturnValue({ json: jsonMock });
        mockRequest = {
            body: {},
            user: undefined,
        };
        mockResponse = {
            json: jsonMock,
            status: statusMock,
        };
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.describe)('register', () => {
        (0, vitest_1.it)('should create a new user with valid input', async () => {
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
            vitest_1.vi.mocked(userService_1.default.findUserByEmail).mockResolvedValue(null);
            vitest_1.vi.mocked(userService_1.default.findUserByUsername).mockResolvedValue(null);
            vitest_1.vi.mocked(passwordService_1.default.hashPassword).mockResolvedValue('hashedPassword');
            vitest_1.vi.mocked(userService_1.default.createUser).mockResolvedValue(mockUser);
            await (0, authController_1.register)(mockRequest, mockResponse);
            (0, vitest_1.expect)(statusMock).toHaveBeenCalledWith(201);
            (0, vitest_1.expect)(jsonMock).toHaveBeenCalledWith(mockUser);
        });
        (0, vitest_1.it)('should return 400 for missing fields', async () => {
            mockRequest.body = { email: 'test@example.com' };
            await (0, authController_1.register)(mockRequest, mockResponse);
            (0, vitest_1.expect)(statusMock).toHaveBeenCalledWith(400);
            (0, vitest_1.expect)(jsonMock).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
                error: vitest_1.expect.objectContaining({
                    code: 'VALIDATION_ERROR',
                }),
            }));
        });
        (0, vitest_1.it)('should return 400 for invalid email format', async () => {
            mockRequest.body = {
                email: 'invalid-email',
                username: 'testuser',
                password: 'password123',
            };
            await (0, authController_1.register)(mockRequest, mockResponse);
            (0, vitest_1.expect)(statusMock).toHaveBeenCalledWith(400);
            (0, vitest_1.expect)(jsonMock).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
                error: vitest_1.expect.objectContaining({
                    code: 'VALIDATION_ERROR',
                    details: vitest_1.expect.objectContaining({
                        email: vitest_1.expect.arrayContaining(['Invalid email format']),
                    }),
                }),
            }));
        });
        (0, vitest_1.it)('should return 400 for short password', async () => {
            mockRequest.body = {
                email: 'test@example.com',
                username: 'testuser',
                password: 'short',
            };
            await (0, authController_1.register)(mockRequest, mockResponse);
            (0, vitest_1.expect)(statusMock).toHaveBeenCalledWith(400);
            (0, vitest_1.expect)(jsonMock).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
                error: vitest_1.expect.objectContaining({
                    code: 'VALIDATION_ERROR',
                    details: vitest_1.expect.objectContaining({
                        password: vitest_1.expect.arrayContaining(['Password must be at least 8 characters']),
                    }),
                }),
            }));
        });
        (0, vitest_1.it)('should return 409 for existing email', async () => {
            mockRequest.body = {
                email: 'test@example.com',
                username: 'testuser',
                password: 'password123',
            };
            vitest_1.vi.mocked(userService_1.default.findUserByEmail).mockResolvedValue({ id: '123' });
            await (0, authController_1.register)(mockRequest, mockResponse);
            (0, vitest_1.expect)(statusMock).toHaveBeenCalledWith(409);
            (0, vitest_1.expect)(jsonMock).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
                error: vitest_1.expect.objectContaining({
                    code: 'EMAIL_EXISTS',
                }),
            }));
        });
        (0, vitest_1.it)('should return 409 for existing username', async () => {
            mockRequest.body = {
                email: 'test@example.com',
                username: 'testuser',
                password: 'password123',
            };
            vitest_1.vi.mocked(userService_1.default.findUserByEmail).mockResolvedValue(null);
            vitest_1.vi.mocked(userService_1.default.findUserByUsername).mockResolvedValue({ id: '123' });
            await (0, authController_1.register)(mockRequest, mockResponse);
            (0, vitest_1.expect)(statusMock).toHaveBeenCalledWith(409);
            (0, vitest_1.expect)(jsonMock).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
                error: vitest_1.expect.objectContaining({
                    code: 'USERNAME_EXISTS',
                }),
            }));
        });
    });
    (0, vitest_1.describe)('login', () => {
        (0, vitest_1.it)('should return tokens and user data for valid credentials', async () => {
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
                generateAccessToken: vitest_1.vi.fn().mockReturnValue('accessToken'),
                generateRefreshToken: vitest_1.vi.fn().mockReturnValue('refreshToken'),
            };
            vitest_1.vi.mocked(userService_1.default.findUserByEmail).mockResolvedValue(mockUser);
            vitest_1.vi.mocked(passwordService_1.default.comparePassword).mockResolvedValue(true);
            vitest_1.vi.mocked(jwtService_1.jwtService).mockReturnValue(mockJwtService);
            await (0, authController_1.login)(mockRequest, mockResponse);
            (0, vitest_1.expect)(jsonMock).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
                accessToken: 'accessToken',
                refreshToken: 'refreshToken',
                user: vitest_1.expect.objectContaining({
                    id: '123',
                    email: 'test@example.com',
                    username: 'testuser',
                }),
            }));
            (0, vitest_1.expect)(jsonMock.mock.calls[0][0].user).not.toHaveProperty('password');
        });
        (0, vitest_1.it)('should return 401 for invalid email', async () => {
            mockRequest.body = {
                email: 'test@example.com',
                password: 'password123',
            };
            vitest_1.vi.mocked(userService_1.default.findUserByEmail).mockResolvedValue(null);
            await (0, authController_1.login)(mockRequest, mockResponse);
            (0, vitest_1.expect)(statusMock).toHaveBeenCalledWith(401);
            (0, vitest_1.expect)(jsonMock).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
                error: vitest_1.expect.objectContaining({
                    code: 'INVALID_CREDENTIALS',
                }),
            }));
        });
        (0, vitest_1.it)('should return 401 for invalid password', async () => {
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
            vitest_1.vi.mocked(userService_1.default.findUserByEmail).mockResolvedValue(mockUser);
            vitest_1.vi.mocked(passwordService_1.default.comparePassword).mockResolvedValue(false);
            await (0, authController_1.login)(mockRequest, mockResponse);
            (0, vitest_1.expect)(statusMock).toHaveBeenCalledWith(401);
            (0, vitest_1.expect)(jsonMock).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
                error: vitest_1.expect.objectContaining({
                    code: 'INVALID_CREDENTIALS',
                }),
            }));
        });
    });
    (0, vitest_1.describe)('refresh', () => {
        (0, vitest_1.it)('should return new access token for valid refresh token', async () => {
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
                verifyRefreshToken: vitest_1.vi.fn().mockReturnValue({ userId: '123' }),
                generateAccessToken: vitest_1.vi.fn().mockReturnValue('newAccessToken'),
            };
            vitest_1.vi.mocked(jwtService_1.jwtService).mockReturnValue(mockJwtService);
            vitest_1.vi.mocked(userService_1.default.findUserById).mockResolvedValue(mockUser);
            await (0, authController_1.refresh)(mockRequest, mockResponse);
            (0, vitest_1.expect)(jsonMock).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
                accessToken: 'newAccessToken',
            }));
        });
        (0, vitest_1.it)('should return 401 for invalid refresh token', async () => {
            mockRequest.body = {
                refreshToken: 'invalidToken',
            };
            const mockJwtService = {
                verifyRefreshToken: vitest_1.vi.fn().mockReturnValue(null),
            };
            vitest_1.vi.mocked(jwtService_1.jwtService).mockReturnValue(mockJwtService);
            await (0, authController_1.refresh)(mockRequest, mockResponse);
            (0, vitest_1.expect)(statusMock).toHaveBeenCalledWith(401);
            (0, vitest_1.expect)(jsonMock).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
                error: vitest_1.expect.objectContaining({
                    code: 'INVALID_TOKEN',
                }),
            }));
        });
    });
    (0, vitest_1.describe)('logout', () => {
        (0, vitest_1.it)('should return success message', async () => {
            await (0, authController_1.logout)(mockRequest, mockResponse);
            (0, vitest_1.expect)(jsonMock).toHaveBeenCalledWith({ message: 'Logout successful' });
        });
    });
    (0, vitest_1.describe)('forgotPassword', () => {
        (0, vitest_1.it)('should generate and store reset token for valid email', async () => {
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
            vitest_1.vi.mocked(userService_1.default.findUserByEmail).mockResolvedValue(mockUser);
            vitest_1.vi.mocked(passwordService_1.default.generateResetToken).mockReturnValue('resetToken123');
            vitest_1.vi.mocked(passwordService_1.default.hashResetToken).mockReturnValue('hashedResetToken');
            vitest_1.vi.mocked(userService_1.default.setResetToken).mockResolvedValue(mockUser);
            await (0, authController_1.forgotPassword)(mockRequest, mockResponse);
            (0, vitest_1.expect)(userService_1.default.setResetToken).toHaveBeenCalledWith('123', 'hashedResetToken', vitest_1.expect.any(Date));
            (0, vitest_1.expect)(jsonMock).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
                message: vitest_1.expect.stringContaining('password reset link'),
            }));
        });
        (0, vitest_1.it)('should return success message even for non-existent email', async () => {
            mockRequest.body = {
                email: 'nonexistent@example.com',
            };
            vitest_1.vi.mocked(userService_1.default.findUserByEmail).mockResolvedValue(null);
            await (0, authController_1.forgotPassword)(mockRequest, mockResponse);
            (0, vitest_1.expect)(jsonMock).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
                message: vitest_1.expect.stringContaining('password reset link'),
            }));
        });
    });
    (0, vitest_1.describe)('resetPassword', () => {
        (0, vitest_1.it)('should update password for valid reset token', async () => {
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
            vitest_1.vi.mocked(passwordService_1.default.hashResetToken).mockReturnValue('hashedResetToken');
            vitest_1.vi.mocked(userService_1.default.findUserByResetToken).mockResolvedValue(mockUser);
            vitest_1.vi.mocked(passwordService_1.default.hashPassword).mockResolvedValue('newHashedPassword');
            vitest_1.vi.mocked(userService_1.default.updatePassword).mockResolvedValue(mockUser);
            vitest_1.vi.mocked(userService_1.default.clearResetToken).mockResolvedValue(mockUser);
            await (0, authController_1.resetPassword)(mockRequest, mockResponse);
            (0, vitest_1.expect)(userService_1.default.updatePassword).toHaveBeenCalledWith('123', 'newHashedPassword');
            (0, vitest_1.expect)(userService_1.default.clearResetToken).toHaveBeenCalledWith('123');
            (0, vitest_1.expect)(jsonMock).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
                message: 'Password reset successful',
            }));
        });
        (0, vitest_1.it)('should return 401 for invalid reset token', async () => {
            mockRequest.body = {
                token: 'a'.repeat(64),
                password: 'newPassword123',
            };
            vitest_1.vi.mocked(passwordService_1.default.hashResetToken).mockReturnValue('hashedResetToken');
            vitest_1.vi.mocked(userService_1.default.findUserByResetToken).mockResolvedValue(null);
            await (0, authController_1.resetPassword)(mockRequest, mockResponse);
            (0, vitest_1.expect)(statusMock).toHaveBeenCalledWith(401);
            (0, vitest_1.expect)(jsonMock).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
                error: vitest_1.expect.objectContaining({
                    code: 'INVALID_TOKEN',
                }),
            }));
        });
    });
    (0, vitest_1.describe)('getCurrentUser', () => {
        (0, vitest_1.it)('should return user data for authenticated user', async () => {
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
            vitest_1.vi.mocked(userService_1.default.findUserById).mockResolvedValue(mockUser);
            await (0, authController_1.getCurrentUser)(mockRequest, mockResponse);
            (0, vitest_1.expect)(jsonMock).toHaveBeenCalledWith(mockUser);
        });
        (0, vitest_1.it)('should return 401 for unauthenticated request', async () => {
            mockRequest.user = undefined;
            await (0, authController_1.getCurrentUser)(mockRequest, mockResponse);
            (0, vitest_1.expect)(statusMock).toHaveBeenCalledWith(401);
            (0, vitest_1.expect)(jsonMock).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
                error: vitest_1.expect.objectContaining({
                    code: 'NOT_AUTHENTICATED',
                }),
            }));
        });
    });
});
