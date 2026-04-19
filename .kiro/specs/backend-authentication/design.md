# Backend Authentication System Design

## Overview

This design document specifies the architecture and implementation details for a secure backend authentication system built with Express.js, TypeScript, Prisma ORM, and PostgreSQL. The system provides stateless JWT-based authentication with user registration, login, session management via access and refresh tokens, password reset functionality, and protected route middleware.

### Key Design Decisions

**Stateless JWT Authentication**: The system uses JWT tokens for authentication rather than server-side sessions. This approach eliminates the need for session storage, enables horizontal scaling across multiple servers, and reduces memory overhead. Access tokens are short-lived (15 minutes) to limit exposure if compromised, while refresh tokens are longer-lived (7 days) to maintain user sessions without frequent re-authentication.

**Dual-Token Strategy**: Following industry best practices ([skycloak.io](https://skycloak.io/blog/jwt-token-lifecycle-management-expiration-refresh-revocation-strategies/)), the system implements separate access and refresh tokens. Access tokens contain user claims and are included in every API request, while refresh tokens are used solely to obtain new access tokens. This separation balances security (short-lived access tokens) with user experience (persistent sessions via refresh tokens).

**Bcrypt Password Hashing**: Passwords are hashed using bcrypt with 10-12 salt rounds. Bcrypt is deliberately slow and uses a configurable cost factor (2^n iterations) that makes brute-force attacks computationally expensive. The cost factor can be increased over time as hardware improves, ensuring long-term security ([copyprogramming.com](https://copyprogramming.com/howto/how-to-hash-with-bcrypt-in-node)).

**Cryptographically Secure Reset Tokens**: Password reset tokens are generated using Node.js's `crypto.randomBytes()` to ensure unpredictability. Tokens are hashed before database storage and expire after 1 hour, limiting the window for potential attacks ([copyprogramming.com](https://copyprogramming.com/howto/generate-password-reset-token-in-node-js)).

**Integration with Existing Schema**: The design extends the existing Prisma schema by adding a User model with foreign key relationships to Label and Annotation models, enabling user ownership of resources while maintaining referential integrity through cascade deletes.

## Architecture

### System Components

```mermaid
graph TB
    Client[Frontend Client]
    AuthRoutes[Auth Routes]
    AuthController[Auth Controller]
    AuthMiddleware[Auth Middleware]
    ProtectedRoutes[Protected Routes]
    JWTService[JWT Service]
    PasswordService[Password Service]
    UserService[User Service]
    PrismaClient[Prisma Client]
    PostgreSQL[(PostgreSQL Database)]

    Client -->|POST /api/auth/register| AuthRoutes
    Client -->|POST /api/auth/login| AuthRoutes
    Client -->|POST /api/auth/refresh| AuthRoutes
    Client -->|POST /api/auth/forgot-password| AuthRoutes
    Client -->|POST /api/auth/reset-password| AuthRoutes
    Client -->|GET /api/auth/me| AuthRoutes
    Client -->|API Requests with JWT| ProtectedRoutes

    AuthRoutes --> AuthController
    AuthController --> UserService
    AuthController --> JWTService
    AuthController --> PasswordService
    
    ProtectedRoutes --> AuthMiddleware
    AuthMiddleware --> JWTService
    AuthMiddleware -->|Attach User| ProtectedRoutes

    UserService --> PrismaClient
    PrismaClient --> PostgreSQL
```

### Authentication Flow

**Registration Flow**:
1. Client sends email, username, and password to `/api/auth/register`
2. System validates input format and checks for existing email/username
3. Password is hashed using bcrypt with 10-12 salt rounds
4. User record is created in database
5. System returns user data (excluding password hash)

**Login Flow**:
1. Client sends email and password to `/api/auth/login`
2. System retrieves user by email
3. Password is verified against stored hash using bcrypt.compare()
4. If valid, system generates access token (15-minute expiration) and refresh token (7-day expiration)
5. Both tokens are returned to client
6. Client stores tokens (access token in memory, refresh token in httpOnly cookie or secure storage)

**Protected Route Access Flow**:
1. Client includes access token in Authorization header (`Bearer <token>`)
2. Auth middleware extracts and verifies token signature and expiration
3. If valid, user information is attached to request object
4. Request proceeds to route handler
5. If invalid or expired, 401 error is returned

**Token Refresh Flow**:
1. When access token expires, client sends refresh token to `/api/auth/refresh`
2. System verifies refresh token signature and expiration
3. If valid, new access token is generated and returned
4. Client updates stored access token

**Password Reset Flow**:
1. User requests reset via `/api/auth/forgot-password` with email
2. System generates cryptographically secure random token using `crypto.randomBytes(32)`
3. Token is hashed and stored in user record with 1-hour expiration
4. Reset link with token is sent via email (email sending implementation deferred)
5. User clicks link and submits new password to `/api/auth/reset-password`
6. System verifies token hash and expiration
7. If valid, password is hashed and updated, reset token is cleared

## Components and Interfaces

### 1. Auth Routes (`/src/routes/authRoutes.ts`)

Defines RESTful endpoints for authentication operations:

```typescript
POST   /api/auth/register         - User registration
POST   /api/auth/login            - User login
POST   /api/auth/refresh          - Token refresh
POST   /api/auth/logout           - User logout (client-side token clearing)
POST   /api/auth/forgot-password  - Password reset request
POST   /api/auth/reset-password   - Password reset confirmation
GET    /api/auth/me               - Get current user (protected)
```

### 2. Auth Controller (`/src/controllers/authController.ts`)

Handles authentication business logic:

```typescript
interface AuthController {
  register(req: Request, res: Response): Promise<Response>
  login(req: Request, res: Response): Promise<Response>
  refresh(req: Request, res: Response): Promise<Response>
  logout(req: Request, res: Response): Promise<Response>
  forgotPassword(req: Request, res: Response): Promise<Response>
  resetPassword(req: Request, res: Response): Promise<Response>
  getCurrentUser(req: Request, res: Response): Promise<Response>
}
```

**Key Responsibilities**:
- Input validation and sanitization
- Orchestrating service calls (UserService, JWTService, PasswordService)
- Error handling and response formatting
- HTTP status code management

### 3. JWT Service (`/src/services/jwtService.ts`)

Manages JWT token generation and verification:

```typescript
interface JWTService {
  generateAccessToken(payload: TokenPayload): string
  generateRefreshToken(payload: RefreshPayload): string
  verifyAccessToken(token: string): TokenPayload | null
  verifyRefreshToken(token: string): RefreshPayload | null
}

interface TokenPayload {
  userId: string
  email: string
  username: string
}

interface RefreshPayload {
  userId: string
}
```

**Implementation Details**:
- Uses `jsonwebtoken` library (npm package)
- Access token expiration: 15 minutes (`expiresIn: '15m'`)
- Refresh token expiration: 7 days (`expiresIn: '7d'`)
- Secret keys from environment variables: `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`
- Algorithm: HS256 (HMAC with SHA-256)

### 4. Password Service (`/src/services/passwordService.ts`)

Handles password hashing and verification:

```typescript
interface PasswordService {
  hashPassword(password: string): Promise<string>
  comparePassword(password: string, hash: string): Promise<boolean>
  generateResetToken(): string
  hashResetToken(token: string): string
}
```

**Implementation Details**:
- Uses `bcrypt` library (npm package)
- Salt rounds: 10-12 (configurable via environment variable `BCRYPT_SALT_ROUNDS`, default 10)
- Reset token generation: `crypto.randomBytes(32).toString('hex')` (64-character hex string)
- Reset token hashing: `crypto.createHash('sha256').update(token).digest('hex')`

### 5. User Service (`/src/services/userService.ts`)

Manages user data operations via Prisma:

```typescript
interface UserService {
  createUser(data: CreateUserInput): Promise<User>
  findUserByEmail(email: string): Promise<User | null>
  findUserByUsername(username: string): Promise<User | null>
  findUserById(id: string): Promise<User | null>
  updatePassword(userId: string, hashedPassword: string): Promise<User>
  setResetToken(userId: string, tokenHash: string, expiry: Date): Promise<User>
  clearResetToken(userId: string): Promise<User>
  findUserByResetToken(tokenHash: string): Promise<User | null>
}

interface CreateUserInput {
  email: string
  username: string
  password: string // hashed password
}
```

### 6. Auth Middleware (`/src/middleware/authMiddleware.ts`)

Protects routes by verifying JWT tokens:

```typescript
interface AuthMiddleware {
  (req: Request, res: Response, next: NextFunction): Promise<void>
}

// Extends Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string
        email: string
        username: string
      }
    }
  }
}
```

**Behavior**:
- Extracts token from `Authorization: Bearer <token>` header
- Verifies token using JWTService
- Attaches decoded user payload to `req.user`
- Returns 401 if token is missing, invalid, or expired
- Calls `next()` if token is valid

### 7. Input Validation

Uses `express-validator` for request validation:

```typescript
// Registration validation
{
  email: isEmail(),
  username: isLength({ min: 3, max: 30 }),
  password: isLength({ min: 8 })
}

// Login validation
{
  email: isEmail(),
  password: notEmpty()
}

// Password reset validation
{
  token: isLength({ min: 64, max: 64 }),
  password: isLength({ min: 8 })
}
```

## Data Models

### User Model (Prisma Schema)

```prisma
model User {
  id                String   @id @default(uuid())
  email             String   @unique
  username          String   @unique
  password          String   // bcrypt hash
  resetToken        String?  // sha256 hash of reset token
  resetTokenExpiry  DateTime?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  labels            Label[]
  annotations       Annotation[]

  @@index([email])
  @@index([username])
}
```

### Updated Label Model

```prisma
model Label {
  id        String   @id @default(uuid())
  projectId String
  name      String
  color     String
  userId    String   // NEW: foreign key to User
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user        User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  annotations Annotation[]

  @@index([projectId])
  @@index([userId])
}
```

### Updated Annotation Model

```prisma
model Annotation {
  id          String   @id @default(uuid())
  docId       String
  labelId     String
  content     String   @default("")
  startOffset Int
  endOffset   Int
  userId      String   // NEW: foreign key to User
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user  User  @relation(fields: [userId], references: [id], onDelete: Cascade)
  label Label @relation(fields: [labelId], references: [id], onDelete: Cascade)

  @@index([docId])
  @@index([userId])
}
```

### Database Migration Strategy

1. Add User model to Prisma schema
2. Add userId fields to Label and Annotation models
3. Create migration: `npx prisma migrate dev --name add_user_authentication`
4. For existing data: Set userId to a default/system user or require data migration script
5. Apply migration to database

### Environment Variables

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/dbname"

# JWT Secrets (generate using: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
JWT_ACCESS_SECRET="<64-character-hex-string>"
JWT_REFRESH_SECRET="<64-character-hex-string>"

# Bcrypt Configuration
BCRYPT_SALT_ROUNDS=10

# Server
PORT=3000
NODE_ENV=development
```


## Error Handling

### Error Response Format

All errors follow a consistent JSON structure:

```typescript
interface ErrorResponse {
  error: {
    message: string
    code: string
    details?: Record<string, string[]> // For validation errors
  }
}
```

### Error Categories and HTTP Status Codes

**400 Bad Request - Validation Errors**:
```json
{
  "error": {
    "message": "Validation failed",
    "code": "VALIDATION_ERROR",
    "details": {
      "email": ["Invalid email format"],
      "password": ["Password must be at least 8 characters"]
    }
  }
}
```

**401 Unauthorized - Authentication Errors**:
```json
{
  "error": {
    "message": "Invalid credentials",
    "code": "INVALID_CREDENTIALS"
  }
}
```

```json
{
  "error": {
    "message": "Token expired",
    "code": "TOKEN_EXPIRED"
  }
}
```

```json
{
  "error": {
    "message": "Invalid or missing token",
    "code": "INVALID_TOKEN"
  }
}
```

**409 Conflict - Resource Conflicts**:
```json
{
  "error": {
    "message": "Email already registered",
    "code": "EMAIL_EXISTS"
  }
}
```

```json
{
  "error": {
    "message": "Username already taken",
    "code": "USERNAME_EXISTS"
  }
}
```

**500 Internal Server Error - System Errors**:
```json
{
  "error": {
    "message": "An unexpected error occurred",
    "code": "INTERNAL_ERROR"
  }
}
```

### Error Handling Strategy

**Security Considerations**:
- Never expose password hashes in error messages or logs
- Use generic messages for authentication failures to prevent user enumeration
- Log detailed errors server-side but return sanitized messages to clients
- Never reveal whether an email exists during password reset requests

**Input Sanitization**:
- Trim whitespace from email and username inputs
- Validate email format using regex or validation library
- Reject passwords containing null bytes or control characters
- Limit input lengths to prevent buffer overflow attacks

**Database Error Handling**:
- Catch Prisma unique constraint violations and map to 409 Conflict
- Catch connection errors and return 500 with generic message
- Use transactions for operations requiring atomicity
- Implement retry logic for transient database errors

**JWT Error Handling**:
- Catch `TokenExpiredError` and return specific 401 with "TOKEN_EXPIRED" code
- Catch `JsonWebTokenError` and return 401 with "INVALID_TOKEN" code
- Validate token format before verification to prevent crashes
- Handle missing Authorization header gracefully

## Testing Strategy

### Testing Approach

This authentication system requires a comprehensive testing strategy combining **unit tests**, **integration tests**, and **end-to-end tests**. Property-based testing is **not applicable** for this feature because:

1. **External Service Dependencies**: The system heavily relies on external libraries (bcrypt, jsonwebtoken) and database operations that are already tested by their maintainers
2. **Side-Effect Heavy Operations**: Most operations involve database writes, token generation, and state changes that don't benefit from randomized input testing
3. **Specific Scenario Testing**: Authentication logic requires testing specific scenarios (valid/invalid credentials, expired tokens, edge cases) rather than universal properties across random inputs
4. **Deterministic Behavior**: Password hashing and JWT operations are deterministic - the same input always produces verifiable output

### Unit Tests

Unit tests focus on individual components in isolation using mocks for dependencies.

**Password Service Tests** (`passwordService.test.ts`):
- Hash password produces valid bcrypt hash
- Compare password returns true for matching password
- Compare password returns false for non-matching password
- Generate reset token produces 64-character hex string
- Hash reset token produces consistent SHA-256 hash

**JWT Service Tests** (`jwtService.test.ts`):
- Generate access token includes correct payload and expiration
- Generate refresh token includes user ID and expiration
- Verify access token returns payload for valid token
- Verify access token returns null for expired token
- Verify access token returns null for invalid signature
- Verify refresh token validates correctly

**User Service Tests** (`userService.test.ts`):
- Create user inserts record and returns user without password
- Find user by email returns correct user
- Find user by email returns null for non-existent email
- Update password modifies user record
- Set reset token stores hashed token and expiry
- Clear reset token removes token fields

**Auth Middleware Tests** (`authMiddleware.test.ts`):
- Middleware attaches user to request for valid token
- Middleware returns 401 for missing Authorization header
- Middleware returns 401 for invalid token format
- Middleware returns 401 for expired token
- Middleware calls next() for valid token

### Integration Tests

Integration tests verify component interactions with real database (test database) and actual libraries.

**Registration Integration Tests**:
- Successful registration creates user in database
- Registration with existing email returns 409 error
- Registration with existing username returns 409 error
- Registration with invalid email returns 400 error
- Registration with short password returns 400 error
- Password is properly hashed in database

**Login Integration Tests**:
- Successful login returns access and refresh tokens
- Login with invalid email returns 401 error
- Login with invalid password returns 401 error
- Returned tokens are valid and verifiable
- User data excludes password hash

**Token Refresh Integration Tests**:
- Valid refresh token returns new access token
- Expired refresh token returns 401 error
- Invalid refresh token returns 401 error
- New access token contains correct user payload

**Password Reset Integration Tests**:
- Forgot password stores hashed reset token in database
- Forgot password with non-existent email returns success (security)
- Reset password with valid token updates password
- Reset password with expired token returns 401 error
- Reset password clears reset token from database
- Old password no longer works after reset

**Protected Route Integration Tests**:
- Request with valid access token succeeds
- Request without token returns 401 error
- Request with expired token returns 401 error
- Request with invalid token returns 401 error

### End-to-End Tests

E2E tests verify complete user workflows from API perspective.

**User Registration and Login Flow**:
1. Register new user via POST /api/auth/register
2. Verify user can login with credentials
3. Verify returned tokens are valid
4. Access protected endpoint with access token
5. Verify user data is correct

**Token Refresh Flow**:
1. Login to obtain tokens
2. Wait for access token to expire (or mock time)
3. Use refresh token to obtain new access token
4. Verify new access token works for protected routes

**Password Reset Flow**:
1. Request password reset via POST /api/auth/forgot-password
2. Retrieve reset token from database (test environment)
3. Submit new password with token via POST /api/auth/reset-password
4. Verify old password no longer works
5. Verify new password works for login

**Session Management Flow**:
1. Login to obtain tokens
2. Access protected routes with access token
3. Logout (client clears tokens)
4. Verify access token no longer works after logout (stateless, so token still valid until expiry)

### Test Database Setup

- Use separate PostgreSQL database for testing
- Reset database before each test suite
- Use Prisma migrations to set up schema
- Seed test data as needed
- Clean up after tests

### Testing Tools and Libraries

- **Test Framework**: Jest or Vitest
- **HTTP Testing**: Supertest (for API endpoint testing)
- **Mocking**: Jest mocks or Vitest mocks
- **Database**: PostgreSQL test instance
- **Test Coverage Target**: Minimum 80% code coverage for services and controllers

### Security Testing Considerations

- Test SQL injection prevention (Prisma parameterized queries)
- Test XSS prevention (input sanitization)
- Test timing attack resistance (constant-time password comparison via bcrypt)
- Test token expiration enforcement
- Test password complexity requirements
- Test rate limiting (if implemented)

## Implementation Notes

### Dependencies to Install

```json
{
  "dependencies": {
    "express": "^5.2.1",
    "bcrypt": "^5.1.1",
    "jsonwebtoken": "^9.0.2",
    "express-validator": "^7.0.1",
    "dotenv": "^17.4.2",
    "@prisma/client": "^7.7.0"
  },
  "devDependencies": {
    "@types/bcrypt": "^5.0.2",
    "@types/jsonwebtoken": "^9.0.5",
    "jest": "^29.7.0",
    "supertest": "^6.3.3",
    "@types/supertest": "^6.0.2"
  }
}
```

### Implementation Order

1. **Database Schema**: Update Prisma schema with User model and relationships
2. **Services Layer**: Implement PasswordService, JWTService, UserService
3. **Middleware**: Implement authMiddleware
4. **Controllers**: Implement AuthController methods
5. **Routes**: Define auth routes and connect to controller
6. **Validation**: Add input validation middleware
7. **Error Handling**: Implement centralized error handler
8. **Testing**: Write unit, integration, and E2E tests
9. **Documentation**: Update API documentation

### Security Checklist

- [ ] JWT secrets are stored in environment variables, not hardcoded
- [ ] JWT secrets are at least 256 bits (64 hex characters)
- [ ] Passwords are hashed with bcrypt (salt rounds 10-12)
- [ ] Password hashes are never exposed in API responses
- [ ] Reset tokens are cryptographically random and hashed before storage
- [ ] Reset tokens expire after 1 hour
- [ ] Access tokens expire after 15 minutes
- [ ] Refresh tokens expire after 7 days
- [ ] Authentication errors use generic messages to prevent user enumeration
- [ ] Input validation prevents SQL injection and XSS
- [ ] HTTPS is enforced in production (handled by deployment/reverse proxy)
- [ ] CORS is properly configured
- [ ] Rate limiting is implemented for auth endpoints (recommended)

### Future Enhancements

- **Email Service Integration**: Implement actual email sending for password reset
- **Refresh Token Rotation**: Implement refresh token rotation for enhanced security
- **Token Blacklisting**: Add Redis-based token blacklist for logout functionality
- **Multi-Factor Authentication**: Add TOTP-based 2FA
- **OAuth Integration**: Add social login (Google, GitHub)
- **Account Verification**: Add email verification for new registrations
- **Rate Limiting**: Implement rate limiting on auth endpoints to prevent brute force
- **Audit Logging**: Log authentication events for security monitoring
- **Password Strength Meter**: Implement zxcvbn or similar for password strength validation
