import jwt from 'jsonwebtoken';

export interface TokenPayload {
  userId: string;
  email: string;
  username: string;
}

export interface RefreshPayload {
  userId: string;
}

export class JWTService {
  private accessSecret: string;
  private refreshSecret: string;

  constructor() {
    this.accessSecret = process.env.JWT_ACCESS_SECRET || '';
    this.refreshSecret = process.env.JWT_REFRESH_SECRET || '';

    if (!this.accessSecret || !this.refreshSecret) {
      throw new Error('JWT secrets must be defined in environment variables');
    }
  }

  /**
   * Generates an access token with 15-minute expiration
   * @param payload - Token payload containing userId, email, and username
   * @returns Signed JWT access token
   */
  generateAccessToken(payload: TokenPayload): string {
    return jwt.sign(payload, this.accessSecret, {
      expiresIn: '1h',
      algorithm: 'HS256'
    });
  }

  /**
   * Generates a refresh token with 7-day expiration
   * @param payload - Token payload containing userId
   * @returns Signed JWT refresh token
   */
  generateRefreshToken(payload: RefreshPayload): string {
    return jwt.sign(payload, this.refreshSecret, {
      expiresIn: '7d',
      algorithm: 'HS256'
    });
  }

  /**
   * Verifies and decodes an access token
   * @param token - JWT access token to verify
   * @returns Decoded token payload or null if invalid/expired
   */
  verifyAccessToken(token: string): TokenPayload | null {
    try {
      const decoded = jwt.verify(token, this.accessSecret, {
        algorithms: ['HS256']
      }) as TokenPayload;
      return decoded;
    } catch (error) {
      return null;
    }
  }

  /**
   * Verifies and decodes a refresh token
   * @param token - JWT refresh token to verify
   * @returns Decoded token payload or null if invalid/expired
   */
  verifyRefreshToken(token: string): RefreshPayload | null {
    try {
      const decoded = jwt.verify(token, this.refreshSecret, {
        algorithms: ['HS256']
      }) as RefreshPayload;
      return decoded;
    } catch (error) {
      return null;
    }
  }
}

// Lazy singleton instance
let jwtServiceInstance: JWTService | null = null;

export const jwtService = (): JWTService => {
  if (!jwtServiceInstance) {
    jwtServiceInstance = new JWTService();
  }
  return jwtServiceInstance;
};
