import { Request, Response } from 'express';
import userService from '../services/userService';
import passwordService from '../services/passwordService';
import { jwtService } from '../services/jwtService';

/**
 * AuthController handles authentication-related HTTP requests
 * 
 * Validates Requirements:
 * - 1.1, 1.2, 1.3, 1.4, 1.7: User registration with validation and duplicate checking
 * - 2.1, 2.2, 2.3, 2.4, 2.5, 2.6: User login with credential verification and token generation
 * - 3.6: Token refresh functionality
 * - 5.1, 5.2, 5.3, 5.4, 5.5, 5.6: Password reset functionality
 * - 8.1, 8.2, 8.3, 8.4: Session management
 */

/**
 * Register a new user
 * POST /api/auth/register
 * Body: { email, username, password }
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, username, password } = req.body;

    // Input validation
    if (!email || !username || !password) {
      res.status(400).json({
        error: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: {
            ...((!email) && { email: ['Email is required'] }),
            ...((!username) && { username: ['Username is required'] }),
            ...((!password) && { password: ['Password is required'] }),
          },
        },
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({
        error: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: {
            email: ['Invalid email format'],
          },
        },
      });
      return;
    }

    // Validate password length
    if (password.length < 8) {
      res.status(400).json({
        error: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: {
            password: ['Password must be at least 8 characters'],
          },
        },
      });
      return;
    }

    // Validate username length
    if (username.length < 3 || username.length > 30) {
      res.status(400).json({
        error: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: {
            username: ['Username must be between 3 and 30 characters'],
          },
        },
      });
      return;
    }

    // Check for existing email
    const existingEmail = await userService.findUserByEmail(email.trim().toLowerCase());
    if (existingEmail) {
      res.status(409).json({
        error: {
          message: 'Email already registered',
          code: 'EMAIL_EXISTS',
        },
      });
      return;
    }

    // Check for existing username
    const existingUsername = await userService.findUserByUsername(username.trim());
    if (existingUsername) {
      res.status(409).json({
        error: {
          message: 'Username already taken',
          code: 'USERNAME_EXISTS',
        },
      });
      return;
    }

    // Hash password
    const hashedPassword = await passwordService.hashPassword(password);

    // Create user
    const user = await userService.createUser({
      email: email.trim().toLowerCase(),
      username: username.trim(),
      password: hashedPassword,
    });

    res.status(201).json(user);
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: {
        message: 'An unexpected error occurred',
        code: 'INTERNAL_ERROR',
      },
    });
  }
};

/**
 * Login a user
 * POST /api/auth/login
 * Body: { email, password }
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Input validation
    if (!email || !password) {
      res.status(400).json({
        error: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: {
            ...((!email) && { email: ['Email is required'] }),
            ...((!password) && { password: ['Password is required'] }),
          },
        },
      });
      return;
    }

    // Find user by email
    const user = await userService.findUserByEmail(email.trim().toLowerCase());
    if (!user) {
      res.status(401).json({
        error: {
          message: 'Invalid credentials',
          code: 'INVALID_CREDENTIALS',
        },
      });
      return;
    }

    // Verify password
    const isPasswordValid = await passwordService.comparePassword(password, user.password);
    if (!isPasswordValid) {
      res.status(401).json({
        error: {
          message: 'Invalid credentials',
          code: 'INVALID_CREDENTIALS',
        },
      });
      return;
    }

    // Generate tokens
    const jwt = jwtService();
    const accessToken = jwt.generateAccessToken({
      userId: user.id,
      email: user.email,
      username: user.username,
    });
    const refreshToken = jwt.generateRefreshToken({
      userId: user.id,
    });

    // Return tokens and user data (excluding password)
    const { password: _, ...userWithoutPassword } = user;
    res.json({
      accessToken,
      refreshToken,
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: {
        message: 'An unexpected error occurred',
        code: 'INTERNAL_ERROR',
      },
    });
  }
};

/**
 * Refresh access token
 * POST /api/auth/refresh
 * Body: { refreshToken }
 */
export const refresh = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({
        error: {
          message: 'Refresh token is required',
          code: 'VALIDATION_ERROR',
        },
      });
      return;
    }

    // Verify refresh token
    const jwt = jwtService();
    const payload = jwt.verifyRefreshToken(refreshToken);
    if (!payload) {
      res.status(401).json({
        error: {
          message: 'Invalid or expired token',
          code: 'INVALID_TOKEN',
        },
      });
      return;
    }

    // Get user data
    const user = await userService.findUserById(payload.userId);
    if (!user) {
      res.status(401).json({
        error: {
          message: 'User not found',
          code: 'INVALID_TOKEN',
        },
      });
      return;
    }

    // Generate new access token
    const accessToken = jwt.generateAccessToken({
      userId: user.id,
      email: user.email,
      username: user.username,
    });

    res.json({ accessToken });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      error: {
        message: 'An unexpected error occurred',
        code: 'INTERNAL_ERROR',
      },
    });
  }
};

/**
 * Logout a user (client-side token clearing)
 * POST /api/auth/logout
 */
export const logout = async (req: Request, res: Response): Promise<void> => {
  // Since we're using stateless JWT, logout is handled client-side
  // This endpoint exists for consistency and future enhancements (e.g., token blacklisting)
  res.json({ message: 'Logout successful' });
};

/**
 * Request password reset
 * POST /api/auth/forgot-password
 * Body: { email }
 */
export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({
        error: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: {
            email: ['Email is required'],
          },
        },
      });
      return;
    }

    // Find user by email
    const user = await userService.findUserByEmail(email.trim().toLowerCase());
    
    // Always return success to prevent user enumeration
    // Even if user doesn't exist, we return success
    if (!user) {
      res.json({ message: 'If the email exists, a password reset link has been sent' });
      return;
    }

    // Generate reset token
    const resetToken = passwordService.generateResetToken();
    const resetTokenHash = passwordService.hashResetToken(resetToken);
    
    // Set token expiry to 1 hour from now
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + 1);

    // Store hashed token in database
    await userService.setResetToken(user.id, resetTokenHash, expiry);

    // TODO: Send email with reset token
    // For now, we'll just log it (in production, this would be sent via email)
    // console.log(`Password reset token for ${email}: ${resetToken}`);

    res.json({ message: 'If the email exists, a password reset link has been sent' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      error: {
        message: 'An unexpected error occurred',
        code: 'INTERNAL_ERROR',
      },
    });
  }
};

/**
 * Reset password with token
 * POST /api/auth/reset-password
 * Body: { token, password }
 */
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, password } = req.body;

    // Input validation
    if (!token || !password) {
      res.status(400).json({
        error: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: {
            ...((!token) && { token: ['Reset token is required'] }),
            ...((!password) && { password: ['Password is required'] }),
          },
        },
      });
      return;
    }

    // Validate password length
    if (password.length < 8) {
      res.status(400).json({
        error: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: {
            password: ['Password must be at least 8 characters'],
          },
        },
      });
      return;
    }

    // Validate token length (should be 64 characters)
    if (token.length !== 64) {
      res.status(401).json({
        error: {
          message: 'Invalid or expired reset token',
          code: 'INVALID_TOKEN',
        },
      });
      return;
    }

    // Hash the provided token to match against database
    const tokenHash = passwordService.hashResetToken(token);

    // Find user by reset token
    const user = await userService.findUserByResetToken(tokenHash);
    if (!user) {
      res.status(401).json({
        error: {
          message: 'Invalid or expired reset token',
          code: 'INVALID_TOKEN',
        },
      });
      return;
    }

    // Hash new password
    const hashedPassword = await passwordService.hashPassword(password);

    // Update password
    await userService.updatePassword(user.id, hashedPassword);

    // Clear reset token
    await userService.clearResetToken(user.id);

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      error: {
        message: 'An unexpected error occurred',
        code: 'INTERNAL_ERROR',
      },
    });
  }
};

/**
 * Get current authenticated user
 * GET /api/auth/me
 * Requires authentication middleware
 */
export const getCurrentUser = async (req: Request, res: Response): Promise<void> => {
  try {
    // User is attached to request by auth middleware
    if (!req.user) {
      res.status(401).json({
        error: {
          message: 'Not authenticated',
          code: 'NOT_AUTHENTICATED',
        },
      });
      return;
    }

    // Fetch full user data from database
    const user = await userService.findUserById(req.user.userId);
    if (!user) {
      res.status(404).json({
        error: {
          message: 'User not found',
          code: 'USER_NOT_FOUND',
        },
      });
      return;
    }

    res.json(user);
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      error: {
        message: 'An unexpected error occurred',
        code: 'INTERNAL_ERROR',
      },
    });
  }
};
