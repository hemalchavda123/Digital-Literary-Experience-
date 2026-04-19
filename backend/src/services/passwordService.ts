import bcrypt from 'bcrypt';
import crypto from 'crypto';

/**
 * PasswordService handles password hashing, verification, and reset token generation
 * 
 * Validates Requirements:
 * - 1.2: Hash passwords using bcrypt with configurable salt rounds (10-12)
 * - 2.1: Verify passwords using bcrypt.compare()
 * - 5.1: Generate cryptographically secure reset tokens
 * - 5.4: Hash reset tokens using SHA-256
 */
class PasswordService {
  private saltRounds: number;

  constructor() {
    // Use environment variable or default to 10 salt rounds
    this.saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10);
    
    // Validate salt rounds are within acceptable range (10-12)
    if (this.saltRounds < 10 || this.saltRounds > 12) {
      console.warn(`BCRYPT_SALT_ROUNDS should be between 10-12. Using default: 10`);
      this.saltRounds = 10;
    }
  }

  /**
   * Hash a password using bcrypt
   * @param password - Plain text password to hash
   * @returns Promise resolving to bcrypt hash
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.saltRounds);
  }

  /**
   * Compare a plain text password with a bcrypt hash
   * @param password - Plain text password to verify
   * @param hash - Bcrypt hash to compare against
   * @returns Promise resolving to true if password matches, false otherwise
   */
  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generate a cryptographically secure random reset token
   * @returns 64-character hexadecimal string
   */
  generateResetToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Hash a reset token using SHA-256
   * @param token - Plain text reset token to hash
   * @returns SHA-256 hash as hexadecimal string
   */
  hashResetToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}

export default new PasswordService();
