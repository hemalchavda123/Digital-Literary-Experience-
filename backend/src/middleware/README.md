# Validation Middleware

This directory contains validation middleware for the authentication system using `express-validator`.

## Overview

The validation middleware provides:
- Input validation for authentication endpoints
- Automatic error handling with field-specific error messages
- Consistent error response format (400 status with details)

## Usage

Import the validation rules and apply them to routes:

```typescript
import {
  validateRegistration,
  validateLogin,
  validatePasswordReset,
  validateForgotPassword,
} from '../middleware/validationMiddleware';

// Apply to routes
router.post('/register', validateRegistration, register);
router.post('/login', validateLogin, login);
router.post('/reset-password', validatePasswordReset, resetPassword);
router.post('/forgot-password', validateForgotPassword, forgotPassword);
```

## Validation Rules

### Registration (`validateRegistration`)
- **email**: Must be valid email format, normalized
- **username**: Length between 3-30 characters, trimmed
- **password**: Minimum 8 characters

### Login (`validateLogin`)
- **email**: Must be valid email format, normalized
- **password**: Must not be empty

### Password Reset (`validatePasswordReset`)
- **token**: Exactly 64 characters (hex string)
- **password**: Minimum 8 characters

### Forgot Password (`validateForgotPassword`)
- **email**: Must be valid email format, normalized

## Error Response Format

When validation fails, the middleware returns a 400 status with this structure:

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

## Custom Validation

To create custom validation rules:

```typescript
import { body } from 'express-validator';
import { handleValidationErrors } from './validationMiddleware';

export const validateCustom = [
  body('field')
    .isLength({ min: 5 })
    .withMessage('Field must be at least 5 characters'),
  handleValidationErrors,
];
```

## Testing

Tests are located in `validationMiddleware.test.ts` and cover:
- Valid input scenarios
- Invalid email formats
- Password length requirements
- Username length requirements
- Token format validation
