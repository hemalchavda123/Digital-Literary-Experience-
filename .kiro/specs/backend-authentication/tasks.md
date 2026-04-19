# Implementation Plan: Backend Authentication System

## Overview

This implementation plan breaks down the backend authentication system into discrete coding tasks. The system will provide JWT-based authentication with user registration, login, session management, password reset, and protected route middleware. Implementation follows a bottom-up approach: database schema → services → middleware → controllers → routes → integration.

## Tasks

- [x] 1. Set up database schema and User model
  - Update Prisma schema to add User model with fields: id, email, username, password, resetToken, resetTokenExpiry, createdAt, updatedAt
  - Add unique constraints on email and username fields
  - Add userId foreign key to Label and Annotation models with cascade delete
  - Add database indexes on email and username fields
  - Create and apply Prisma migration
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 10.1, 10.2, 10.5_

- [ ] 2. Implement Password Service
  - [x] 2.1 Create PasswordService class in `/src/services/passwordService.ts`
    - Implement `hashPassword()` method using bcrypt with configurable salt rounds (10-12)
    - Implement `comparePassword()` method using bcrypt.compare()
    - Implement `generateResetToken()` method using crypto.randomBytes(32)
    - Implement `hashResetToken()` method using SHA-256
    - _Requirements: 1.2, 2.1, 5.1, 5.4_

  - [ ]* 2.2 Write unit tests for PasswordService
    - Test password hashing produces valid bcrypt hash
    - Test password comparison returns true for matching passwords
    - Test password comparison returns false for non-matching passwords
    - Test reset token generation produces 64-character hex string
    - Test reset token hashing produces consistent SHA-256 hash
    - _Requirements: 1.2, 2.1, 5.1_

- [ ] 3. Implement JWT Service
  - [x] 3.1 Create JWTService class in `/src/services/jwtService.ts`
    - Implement `generateAccessToken()` with 15-minute expiration and payload (userId, email, username)
    - Implement `generateRefreshToken()` with 7-day expiration and payload (userId)
    - Implement `verifyAccessToken()` to verify signature and expiration
    - Implement `verifyRefreshToken()` to verify signature and expiration
    - Use JWT_ACCESS_SECRET and JWT_REFRESH_SECRET from environment variables
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [ ]* 3.2 Write unit tests for JWTService
    - Test access token generation includes correct payload and expiration
    - Test refresh token generation includes userId and expiration
    - Test access token verification returns payload for valid token
    - Test access token verification returns null for expired token
    - Test access token verification returns null for invalid signature
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 4. Implement User Service
  - [x] 4.1 Create UserService class in `/src/services/userService.ts`
    - Implement `createUser()` to insert user record via Prisma
    - Implement `findUserByEmail()` to query user by email
    - Implement `findUserByUsername()` to query user by username
    - Implement `findUserById()` to query user by ID
    - Implement `updatePassword()` to update user password
    - Implement `setResetToken()` to store hashed reset token and expiry
    - Implement `clearResetToken()` to remove reset token fields
    - Implement `findUserByResetToken()` to query user by reset token hash
    - Ensure password field is excluded from returned user objects
    - _Requirements: 1.1, 1.7, 5.2, 5.4, 5.6, 6.1_

  - [ ]* 4.2 Write unit tests for UserService
    - Test createUser inserts record and returns user without password
    - Test findUserByEmail returns correct user
    - Test findUserByEmail returns null for non-existent email
    - Test updatePassword modifies user record
    - Test setResetToken stores hashed token and expiry
    - Test clearResetToken removes token fields
    - _Requirements: 1.1, 1.7, 5.2, 5.4, 5.6_

- [ ] 5. Implement authentication middleware
  - [x] 5.1 Create authMiddleware in `/src/middleware/authMiddleware.ts`
    - Extract JWT token from Authorization header (Bearer format)
    - Verify token using JWTService
    - Attach decoded user payload to req.user
    - Return 401 error if token is missing, invalid, or expired
    - Call next() if token is valid
    - Extend Express Request type to include user property
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [ ]* 5.2 Write unit tests for authMiddleware
    - Test middleware attaches user to request for valid token
    - Test middleware returns 401 for missing Authorization header
    - Test middleware returns 401 for invalid token format
    - Test middleware returns 401 for expired token
    - Test middleware calls next() for valid token
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Implement Auth Controller
  - [x] 7.1 Create AuthController class in `/src/controllers/authController.ts`
    - Implement `register()` method with input validation, duplicate checking, password hashing, and user creation
    - Implement `login()` method with credential verification, token generation, and user data return
    - Implement `refresh()` method to verify refresh token and generate new access token
    - Implement `logout()` method (returns success response for client-side token clearing)
    - Implement `forgotPassword()` method to generate reset token, hash it, and store with expiry
    - Implement `resetPassword()` method to verify reset token, update password, and clear reset token
    - Implement `getCurrentUser()` method to return authenticated user data
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.7, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.6, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 8.1, 8.2, 8.3, 8.4_

  - [ ]* 7.2 Write integration tests for AuthController
    - Test successful registration creates user in database
    - Test registration with existing email returns 409 error
    - Test registration with existing username returns 409 error
    - Test successful login returns access and refresh tokens
    - Test login with invalid credentials returns 401 error
    - Test token refresh with valid refresh token returns new access token
    - Test token refresh with expired token returns 401 error
    - Test forgot password stores hashed reset token in database
    - Test reset password with valid token updates password
    - Test reset password with expired token returns 401 error
    - _Requirements: 1.1, 1.3, 1.4, 2.1, 2.2, 2.4, 3.6, 5.1, 5.4, 5.5, 8.1, 8.2_

- [ ] 8. Implement input validation
  - [x] 8.1 Create validation middleware using express-validator
    - Create registration validation: email format, username length (3-30), password length (min 8)
    - Create login validation: email format, password not empty
    - Create password reset validation: token length (64 chars), password length (min 8)
    - Create forgot password validation: email format
    - Add validation error handling middleware to return 400 with field-specific errors
    - _Requirements: 1.5, 1.6, 7.1, 7.2_

  - [ ]* 8.2 Write unit tests for validation middleware
    - Test registration validation rejects invalid email format
    - Test registration validation rejects short username
    - Test registration validation rejects short password
    - Test login validation rejects invalid email format
    - Test password reset validation rejects invalid token length
    - _Requirements: 1.5, 1.6, 7.1, 7.2_

- [ ] 9. Implement auth routes
  - [x] 9.1 Create auth routes in `/src/routes/authRoutes.ts`
    - Define POST /api/auth/register route with validation and controller
    - Define POST /api/auth/login route with validation and controller
    - Define POST /api/auth/refresh route with controller
    - Define POST /api/auth/logout route with controller
    - Define POST /api/auth/forgot-password route with validation and controller
    - Define POST /api/auth/reset-password route with validation and controller
    - Define GET /api/auth/me route with authMiddleware and controller
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7_

  - [ ]* 9.2 Write integration tests for auth routes
    - Test POST /api/auth/register endpoint creates user and returns user data
    - Test POST /api/auth/login endpoint returns tokens and user data
    - Test POST /api/auth/refresh endpoint returns new access token
    - Test POST /api/auth/forgot-password endpoint returns success
    - Test POST /api/auth/reset-password endpoint updates password
    - Test GET /api/auth/me endpoint returns current user with valid token
    - Test GET /api/auth/me endpoint returns 401 without token
    - _Requirements: 9.1, 9.2, 9.3, 9.5, 9.6, 9.7_

- [ ] 10. Implement centralized error handling
  - [x] 10.1 Create error handling middleware in `/src/middleware/errorHandler.ts`
    - Handle validation errors (400) with field-specific messages
    - Handle authentication errors (401) with generic messages
    - Handle conflict errors (409) for duplicate email/username
    - Handle database errors (500) without exposing sensitive details
    - Implement consistent error response format with message, code, and optional details
    - _Requirements: 7.2, 7.3, 7.4, 7.5_

  - [ ]* 10.2 Write unit tests for error handler
    - Test validation errors return 400 with field details
    - Test authentication errors return 401 with generic message
    - Test conflict errors return 409 with specific message
    - Test database errors return 500 without sensitive details
    - _Requirements: 7.2, 7.3, 7.4_

- [ ] 11. Wire authentication system into Express app
  - [ ] 11.1 Integrate auth routes into main Express application
    - Import and mount auth routes at /api/auth
    - Add error handling middleware to Express app
    - Configure environment variables (JWT secrets, bcrypt salt rounds)
    - Update existing Label and Annotation routes to use authMiddleware
    - Update Label and Annotation controllers to use userId from req.user
    - _Requirements: 9.8, 10.3, 10.4_

  - [ ]* 11.2 Write end-to-end tests for complete authentication flows
    - Test user registration and login flow
    - Test token refresh flow
    - Test password reset flow
    - Test protected route access with valid token
    - Test protected route rejection without token
    - Test Label creation requires authenticated user
    - Test Annotation creation requires authenticated user
    - _Requirements: 1.1, 2.1, 3.6, 4.3, 5.1, 8.1, 10.3, 10.4_

- [ ] 12. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Implementation follows bottom-up approach: services → middleware → controllers → routes
- Testing strategy uses unit tests for services, integration tests for controllers, and E2E tests for complete flows
- Property-based testing is not applicable for this feature (external dependencies, side effects, specific scenarios)
- Environment variables must be configured before running: JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, BCRYPT_SALT_ROUNDS, DATABASE_URL
- Existing Label and Annotation models will be updated to include userId foreign key
