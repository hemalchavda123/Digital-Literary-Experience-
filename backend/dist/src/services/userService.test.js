"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const userService_1 = __importDefault(require("./userService"));
const db_1 = __importDefault(require("../config/db"));
(0, vitest_1.describe)('UserService', () => {
    // Store created user IDs for cleanup
    const createdUserIds = [];
    // Clean up test data after each test
    (0, vitest_1.afterEach)(async () => {
        // Delete all users created during tests
        if (createdUserIds.length > 0) {
            await db_1.default.user.deleteMany({
                where: {
                    id: {
                        in: createdUserIds,
                    },
                },
            });
            createdUserIds.length = 0; // Clear the array
        }
        // Also clean up any test users by email pattern
        await db_1.default.user.deleteMany({
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
    (0, vitest_1.describe)('createUser', () => {
        (0, vitest_1.it)('should create a user and return user without password', async () => {
            const userData = {
                email: 'test@example.com',
                username: 'testuser',
                password: 'hashedpassword123',
            };
            const user = await userService_1.default.createUser(userData);
            (0, vitest_1.expect)(user).toBeDefined();
            (0, vitest_1.expect)(user.email).toBe(userData.email);
            (0, vitest_1.expect)(user.username).toBe(userData.username);
            (0, vitest_1.expect)(user.id).toBeDefined();
            (0, vitest_1.expect)(user.password).toBeUndefined();
        });
        (0, vitest_1.it)('should throw error when creating user with duplicate email', async () => {
            const userData = {
                email: 'duplicate@example.com',
                username: 'user1',
                password: 'hashedpassword123',
            };
            await userService_1.default.createUser(userData);
            await (0, vitest_1.expect)(userService_1.default.createUser({
                ...userData,
                username: 'user2',
            })).rejects.toThrow();
        });
        (0, vitest_1.it)('should throw error when creating user with duplicate username', async () => {
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
            await userService_1.default.createUser(userData1);
            await (0, vitest_1.expect)(userService_1.default.createUser(userData2)).rejects.toThrow();
        });
    });
    (0, vitest_1.describe)('findUserByEmail', () => {
        (0, vitest_1.it)('should find user by email', async () => {
            const userData = {
                email: 'findme@example.com',
                username: 'findmeuser',
                password: 'hashedpassword123',
            };
            await userService_1.default.createUser(userData);
            const user = await userService_1.default.findUserByEmail('findme@example.com');
            (0, vitest_1.expect)(user).toBeDefined();
            (0, vitest_1.expect)(user?.email).toBe(userData.email);
            (0, vitest_1.expect)(user?.username).toBe(userData.username);
        });
        (0, vitest_1.it)('should return null for non-existent email', async () => {
            const user = await userService_1.default.findUserByEmail('nonexistent@example.com');
            (0, vitest_1.expect)(user).toBeNull();
        });
    });
    (0, vitest_1.describe)('findUserByUsername', () => {
        (0, vitest_1.it)('should find user by username', async () => {
            const userData = {
                email: 'username@example.com',
                username: 'uniqueusername',
                password: 'hashedpassword123',
            };
            await userService_1.default.createUser(userData);
            const user = await userService_1.default.findUserByUsername('uniqueusername');
            (0, vitest_1.expect)(user).toBeDefined();
            (0, vitest_1.expect)(user?.email).toBe(userData.email);
            (0, vitest_1.expect)(user?.username).toBe(userData.username);
        });
        (0, vitest_1.it)('should return null for non-existent username', async () => {
            const user = await userService_1.default.findUserByUsername('nonexistentuser');
            (0, vitest_1.expect)(user).toBeNull();
        });
    });
    (0, vitest_1.describe)('findUserById', () => {
        (0, vitest_1.it)('should find user by ID and exclude password', async () => {
            const userData = {
                email: 'findbyid@example.com',
                username: 'findbyiduser',
                password: 'hashedpassword123',
            };
            const createdUser = await userService_1.default.createUser(userData);
            const user = await userService_1.default.findUserById(createdUser.id);
            (0, vitest_1.expect)(user).toBeDefined();
            (0, vitest_1.expect)(user?.id).toBe(createdUser.id);
            (0, vitest_1.expect)(user?.email).toBe(userData.email);
            (0, vitest_1.expect)(user?.password).toBeUndefined();
        });
        (0, vitest_1.it)('should return null for non-existent ID', async () => {
            // Use a different UUID that doesn't exist in the database
            const user = await userService_1.default.findUserById('99999999-9999-9999-9999-999999999999');
            (0, vitest_1.expect)(user).toBeNull();
        });
    });
    (0, vitest_1.describe)('updatePassword', () => {
        (0, vitest_1.it)('should update user password', async () => {
            const userData = {
                email: 'updatepw@example.com',
                username: 'updatepwuser',
                password: 'oldhashedpassword',
            };
            const createdUser = await userService_1.default.createUser(userData);
            const updatedUser = await userService_1.default.updatePassword(createdUser.id, 'newhashedpassword');
            (0, vitest_1.expect)(updatedUser).toBeDefined();
            (0, vitest_1.expect)(updatedUser.id).toBe(createdUser.id);
            (0, vitest_1.expect)(updatedUser.password).toBeUndefined();
            // Verify password was actually updated in database
            const userFromDb = await userService_1.default.findUserByEmail(userData.email);
            (0, vitest_1.expect)(userFromDb?.password).toBe('newhashedpassword');
        });
    });
    (0, vitest_1.describe)('setResetToken', () => {
        (0, vitest_1.it)('should set reset token and expiry', async () => {
            const userData = {
                email: 'resettoken@example.com',
                username: 'resettokenuser',
                password: 'hashedpassword123',
            };
            const createdUser = await userService_1.default.createUser(userData);
            const tokenHash = 'hashedresettoken123';
            const expiry = new Date(Date.now() + 3600000); // 1 hour from now
            const updatedUser = await userService_1.default.setResetToken(createdUser.id, tokenHash, expiry);
            (0, vitest_1.expect)(updatedUser).toBeDefined();
            (0, vitest_1.expect)(updatedUser.password).toBeUndefined();
            // Verify token was set in database
            const userFromDb = await userService_1.default.findUserByEmail(userData.email);
            (0, vitest_1.expect)(userFromDb?.resetToken).toBe(tokenHash);
            (0, vitest_1.expect)(userFromDb?.resetTokenExpiry).toEqual(expiry);
        });
    });
    (0, vitest_1.describe)('clearResetToken', () => {
        (0, vitest_1.it)('should clear reset token fields', async () => {
            const userData = {
                email: 'cleartoken@example.com',
                username: 'cleartokenuser',
                password: 'hashedpassword123',
            };
            const createdUser = await userService_1.default.createUser(userData);
            // First set a reset token
            const tokenHash = 'hashedresettoken123';
            const expiry = new Date(Date.now() + 3600000);
            await userService_1.default.setResetToken(createdUser.id, tokenHash, expiry);
            // Then clear it
            const updatedUser = await userService_1.default.clearResetToken(createdUser.id);
            (0, vitest_1.expect)(updatedUser).toBeDefined();
            (0, vitest_1.expect)(updatedUser.password).toBeUndefined();
            // Verify token was cleared in database
            const userFromDb = await userService_1.default.findUserByEmail(userData.email);
            (0, vitest_1.expect)(userFromDb?.resetToken).toBeNull();
            (0, vitest_1.expect)(userFromDb?.resetTokenExpiry).toBeNull();
        });
    });
    (0, vitest_1.describe)('findUserByResetToken', () => {
        (0, vitest_1.it)('should find user by valid reset token', async () => {
            const userData = {
                email: 'findbytoken@example.com',
                username: 'findbytokenuser',
                password: 'hashedpassword123',
            };
            const createdUser = await userService_1.default.createUser(userData);
            const tokenHash = 'uniquetokenhash' + Date.now(); // Make token unique
            const expiry = new Date(Date.now() + 3600000); // 1 hour from now
            await userService_1.default.setResetToken(createdUser.id, tokenHash, expiry);
            const user = await userService_1.default.findUserByResetToken(tokenHash);
            (0, vitest_1.expect)(user).toBeDefined();
            (0, vitest_1.expect)(user?.id).toBe(createdUser.id);
            (0, vitest_1.expect)(user?.email).toBe(userData.email);
        });
        (0, vitest_1.it)('should return null for expired reset token', async () => {
            const userData = {
                email: 'expiredtoken@example.com',
                username: 'expiredtokenuser',
                password: 'hashedpassword123',
            };
            const createdUser = await userService_1.default.createUser(userData);
            const tokenHash = 'expiredtokenhash';
            const expiry = new Date(Date.now() - 3600000); // 1 hour ago (expired)
            await userService_1.default.setResetToken(createdUser.id, tokenHash, expiry);
            const user = await userService_1.default.findUserByResetToken(tokenHash);
            (0, vitest_1.expect)(user).toBeNull();
        });
        (0, vitest_1.it)('should return null for non-existent reset token', async () => {
            const user = await userService_1.default.findUserByResetToken('nonexistenttoken');
            (0, vitest_1.expect)(user).toBeNull();
        });
    });
});
