import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import userService from './userService';
import prisma from '../config/db';

describe('UserService', () => {
  // Store created user IDs for cleanup
  const createdUserIds: string[] = [];

  // Clean up test data after each test
  afterEach(async () => {
    // Delete all users created during tests
    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({
        where: {
          id: {
            in: createdUserIds,
          },
        },
      });
      createdUserIds.length = 0; // Clear the array
    }
    
    // Also clean up any test users by email pattern
    await prisma.user.deleteMany({
      where: {
        OR: [
          { email: { contains: 'test' } },
          { email: { contains: 'example.com' } },
          { email: { contains: 'duplicate' } },
          { email: { contains: 'findme' } },
          { email: { contains: 'username' } },
          { email: { contains: 'findbyid' } },
          { email: { contains: 'updatepw' } },
          { email: { contains: 'resettoken' } },
          { email: { contains: 'cleartoken' } },
          { email: { contains: 'findbytoken' } },
          { email: { contains: 'expiredtoken' } },
        ],
      },
    });
  });

  describe('createUser', () => {
    it('should create a user and return user without password', async () => {
      const userData = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'hashedpassword123',
      };

      const user = await userService.createUser(userData);

      expect(user).toBeDefined();
      expect(user.email).toBe(userData.email);
      expect(user.username).toBe(userData.username);
      expect(user.id).toBeDefined();
      expect((user as any).password).toBeUndefined();
    });

    it('should throw error when creating user with duplicate email', async () => {
      const userData = {
        email: 'duplicate@example.com',
        username: 'user1',
        password: 'hashedpassword123',
      };

      await userService.createUser(userData);

      await expect(
        userService.createUser({
          ...userData,
          username: 'user2',
        })
      ).rejects.toThrow();
    });

    it('should throw error when creating user with duplicate username', async () => {
      const userData1 = {
        email: 'user1@example.com',
        username: 'duplicateuser',
        password: 'hashedpassword123',
      };

      const userData2 = {
        email: 'user2@example.com',
        username: 'duplicateuser',
        password: 'hashedpassword123',
      };

      await userService.createUser(userData1);

      await expect(userService.createUser(userData2)).rejects.toThrow();
    });
  });

  describe('findUserByEmail', () => {
    it('should find user by email', async () => {
      const userData = {
        email: 'findme@example.com',
        username: 'findmeuser',
        password: 'hashedpassword123',
      };

      await userService.createUser(userData);

      const user = await userService.findUserByEmail('findme@example.com');

      expect(user).toBeDefined();
      expect(user?.email).toBe(userData.email);
      expect(user?.username).toBe(userData.username);
    });

    it('should return null for non-existent email', async () => {
      const user = await userService.findUserByEmail('nonexistent@example.com');
      expect(user).toBeNull();
    });
  });

  describe('findUserByUsername', () => {
    it('should find user by username', async () => {
      const userData = {
        email: 'username@example.com',
        username: 'uniqueusername',
        password: 'hashedpassword123',
      };

      await userService.createUser(userData);

      const user = await userService.findUserByUsername('uniqueusername');

      expect(user).toBeDefined();
      expect(user?.email).toBe(userData.email);
      expect(user?.username).toBe(userData.username);
    });

    it('should return null for non-existent username', async () => {
      const user = await userService.findUserByUsername('nonexistentuser');
      expect(user).toBeNull();
    });
  });

  describe('findUserById', () => {
    it('should find user by ID and exclude password', async () => {
      const userData = {
        email: 'findbyid@example.com',
        username: 'findbyiduser',
        password: 'hashedpassword123',
      };

      const createdUser = await userService.createUser(userData);

      const user = await userService.findUserById(createdUser.id);

      expect(user).toBeDefined();
      expect(user?.id).toBe(createdUser.id);
      expect(user?.email).toBe(userData.email);
      expect((user as any)?.password).toBeUndefined();
    });

    it('should return null for non-existent ID', async () => {
      // Use a different UUID that doesn't exist in the database
      const user = await userService.findUserById('99999999-9999-9999-9999-999999999999');
      expect(user).toBeNull();
    });
  });

  describe('updatePassword', () => {
    it('should update user password', async () => {
      const userData = {
        email: 'updatepw@example.com',
        username: 'updatepwuser',
        password: 'oldhashedpassword',
      };

      const createdUser = await userService.createUser(userData);

      const updatedUser = await userService.updatePassword(
        createdUser.id,
        'newhashedpassword'
      );

      expect(updatedUser).toBeDefined();
      expect(updatedUser.id).toBe(createdUser.id);
      expect((updatedUser as any).password).toBeUndefined();

      // Verify password was actually updated in database
      const userFromDb = await userService.findUserByEmail(userData.email);
      expect(userFromDb?.password).toBe('newhashedpassword');
    });
  });

  describe('setResetToken', () => {
    it('should set reset token and expiry', async () => {
      const userData = {
        email: 'resettoken@example.com',
        username: 'resettokenuser',
        password: 'hashedpassword123',
      };

      const createdUser = await userService.createUser(userData);

      const tokenHash = 'hashedresettoken123';
      const expiry = new Date(Date.now() + 3600000); // 1 hour from now

      const updatedUser = await userService.setResetToken(
        createdUser.id,
        tokenHash,
        expiry
      );

      expect(updatedUser).toBeDefined();
      expect((updatedUser as any).password).toBeUndefined();

      // Verify token was set in database
      const userFromDb = await userService.findUserByEmail(userData.email);
      expect(userFromDb?.resetToken).toBe(tokenHash);
      expect(userFromDb?.resetTokenExpiry).toEqual(expiry);
    });
  });

  describe('clearResetToken', () => {
    it('should clear reset token fields', async () => {
      const userData = {
        email: 'cleartoken@example.com',
        username: 'cleartokenuser',
        password: 'hashedpassword123',
      };

      const createdUser = await userService.createUser(userData);

      // First set a reset token
      const tokenHash = 'hashedresettoken123';
      const expiry = new Date(Date.now() + 3600000);
      await userService.setResetToken(createdUser.id, tokenHash, expiry);

      // Then clear it
      const updatedUser = await userService.clearResetToken(createdUser.id);

      expect(updatedUser).toBeDefined();
      expect((updatedUser as any).password).toBeUndefined();

      // Verify token was cleared in database
      const userFromDb = await userService.findUserByEmail(userData.email);
      expect(userFromDb?.resetToken).toBeNull();
      expect(userFromDb?.resetTokenExpiry).toBeNull();
    });
  });

  describe('findUserByResetToken', () => {
    it('should find user by valid reset token', async () => {
      const userData = {
        email: 'findbytoken@example.com',
        username: 'findbytokenuser',
        password: 'hashedpassword123',
      };

      const createdUser = await userService.createUser(userData);

      const tokenHash = 'uniquetokenhash' + Date.now(); // Make token unique
      const expiry = new Date(Date.now() + 3600000); // 1 hour from now
      await userService.setResetToken(createdUser.id, tokenHash, expiry);

      const user = await userService.findUserByResetToken(tokenHash);

      expect(user).toBeDefined();
      expect(user?.id).toBe(createdUser.id);
      expect(user?.email).toBe(userData.email);
    });

    it('should return null for expired reset token', async () => {
      const userData = {
        email: 'expiredtoken@example.com',
        username: 'expiredtokenuser',
        password: 'hashedpassword123',
      };

      const createdUser = await userService.createUser(userData);

      const tokenHash = 'expiredtokenhash';
      const expiry = new Date(Date.now() - 3600000); // 1 hour ago (expired)
      await userService.setResetToken(createdUser.id, tokenHash, expiry);

      const user = await userService.findUserByResetToken(tokenHash);

      expect(user).toBeNull();
    });

    it('should return null for non-existent reset token', async () => {
      const user = await userService.findUserByResetToken('nonexistenttoken');
      expect(user).toBeNull();
    });
  });
});
