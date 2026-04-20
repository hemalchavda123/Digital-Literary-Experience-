import prisma from '../config/db';
import { User } from '@prisma/client';

/**
 * UserService handles all user-related database operations via Prisma
 * 
 * Validates Requirements:
 * - 1.1: Create user records in the database
 * - 1.7: Return user data excluding password hash
 * - 5.2: Store hashed reset tokens with expiry
 * - 5.4: Update user passwords
 * - 5.6: Clear reset tokens after successful password reset
 * - 6.1: Define User model with required fields and relationships
 */

export interface CreateUserInput {
  email: string;
  username: string;
  password: string; // hashed password
}

// User type without password field for safe returns
export type SafeUser = Omit<User, 'password'>;

class UserService {
  /**
   * Create a new user in the database
   * @param data - User creation data with hashed password
   * @returns User object without password field
   */
  async createUser(data: CreateUserInput): Promise<SafeUser> {
    const user = await prisma.user.create({
      data: {
        email: data.email,
        username: data.username,
        password: data.password,
      },
    });

    // Exclude password from returned user object
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Find a user by email address
   * @param email - Email address to search for
   * @returns User object or null if not found
   */
  async findUserByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  /**
   * Find a user by username
   * @param username - Username to search for
   * @returns User object or null if not found
   */
  async findUserByUsername(username: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { username },
    });
  }

  /**
   * Find a user by ID
   * @param id - User ID to search for
   * @returns User object without password or null if not found
   */
  async findUserById(id: string): Promise<SafeUser | null> {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return null;
    }

    // Exclude password from returned user object
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Update a user's password
   * @param userId - ID of the user to update
   * @param hashedPassword - New hashed password
   * @returns Updated user object without password
   */
  async updatePassword(userId: string, hashedPassword: string): Promise<SafeUser> {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    // Exclude password from returned user object
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Set a password reset token and expiry for a user
   * @param userId - ID of the user
   * @param tokenHash - Hashed reset token
   * @param expiry - Token expiration date
   * @returns Updated user object without password
   */
  async setResetToken(userId: string, tokenHash: string, expiry: Date): Promise<SafeUser> {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        resetToken: tokenHash,
        resetTokenExpiry: expiry,
      },
    });

    // Exclude password from returned user object
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Clear the reset token fields for a user
   * @param userId - ID of the user
   * @returns Updated user object without password
   */
  async clearResetToken(userId: string): Promise<SafeUser> {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    // Exclude password from returned user object
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Find a user by reset token hash
   * @param tokenHash - Hashed reset token to search for
   * @returns User object or null if not found or token expired
   */
  async findUserByResetToken(tokenHash: string): Promise<User | null> {
    const user = await prisma.user.findFirst({
      where: {
        resetToken: tokenHash,
        resetTokenExpiry: {
          gt: new Date(), // Token must not be expired
        },
      },
    });

    return user;
  }

  /**
   * Update a user's profile image
   * @param userId - ID of the user
   * @param imageUrl - URL or base64 string of the image
   * @returns Updated user object without password
   */
  async updateProfileImage(userId: string, imageUrl: string): Promise<SafeUser> {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { profileImage: imageUrl },
    });

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}

export default new UserService();
