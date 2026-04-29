"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = __importDefault(require("../config/db"));
class UserService {
    /**
     * Create a new user in the database
     * @param data - User creation data with hashed password
     * @returns User object without password field
     */
    async createUser(data) {
        const user = await db_1.default.user.create({
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
    async findUserByEmail(email) {
        return db_1.default.user.findUnique({
            where: { email },
        });
    }
    /**
     * Find a user by username
     * @param username - Username to search for
     * @returns User object or null if not found
     */
    async findUserByUsername(username) {
        return db_1.default.user.findUnique({
            where: { username },
        });
    }
    /**
     * Find a user by ID
     * @param id - User ID to search for
     * @returns User object without password or null if not found
     */
    async findUserById(id) {
        const user = await db_1.default.user.findUnique({
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
    async updatePassword(userId, hashedPassword) {
        const user = await db_1.default.user.update({
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
    async setResetToken(userId, tokenHash, expiry) {
        const user = await db_1.default.user.update({
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
    async clearResetToken(userId) {
        const user = await db_1.default.user.update({
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
    async findUserByResetToken(tokenHash) {
        const user = await db_1.default.user.findFirst({
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
    async updateProfileImage(userId, imageUrl) {
        const user = await db_1.default.user.update({
            where: { id: userId },
            data: { profileImage: imageUrl },
        });
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
    }
}
exports.default = new UserService();
