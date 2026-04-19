import { describe, it, expect, vi } from 'vitest';
import { Request, Response } from 'express';
import {
  handleValidationErrors,
  validateRegistration,
  validateLogin,
  validatePasswordReset,
  validateForgotPassword,
} from './validationMiddleware';

describe('Validation Middleware', () => {
  describe('validateRegistration', () => {
    it('should pass validation with valid registration data', async () => {
      const req = {
        body: {
          email: 'test@example.com',
          username: 'testuser',
          password: 'password123',
        },
      } as Request;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;
      const next = vi.fn();

      // Run all validation rules
      for (const validator of validateRegistration) {
        if (typeof validator === 'function') {
          await validator(req, res, next);
        } else {
          await validator.run(req);
        }
      }

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should fail validation with invalid email', async () => {
      const req = {
        body: {
          email: 'invalid-email',
          username: 'testuser',
          password: 'password123',
        },
      } as Request;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;
      const next = vi.fn();

      for (const validator of validateRegistration) {
        if (typeof validator === 'function') {
          await validator(req, res, next);
        } else {
          await validator.run(req);
        }
      }

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: expect.objectContaining({
              email: expect.arrayContaining([expect.stringContaining('Invalid email')]),
            }),
          }),
        })
      );
    });

    it('should fail validation with short username', async () => {
      const req = {
        body: {
          email: 'test@example.com',
          username: 'ab',
          password: 'password123',
        },
      } as Request;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;
      const next = vi.fn();

      for (const validator of validateRegistration) {
        if (typeof validator === 'function') {
          await validator(req, res, next);
        } else {
          await validator.run(req);
        }
      }

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            details: expect.objectContaining({
              username: expect.arrayContaining([
                expect.stringContaining('between 3 and 30 characters'),
              ]),
            }),
          }),
        })
      );
    });

    it('should fail validation with short password', async () => {
      const req = {
        body: {
          email: 'test@example.com',
          username: 'testuser',
          password: 'short',
        },
      } as Request;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;
      const next = vi.fn();

      for (const validator of validateRegistration) {
        if (typeof validator === 'function') {
          await validator(req, res, next);
        } else {
          await validator.run(req);
        }
      }

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            details: expect.objectContaining({
              password: expect.arrayContaining([
                expect.stringContaining('at least 8 characters'),
              ]),
            }),
          }),
        })
      );
    });
  });

  describe('validateLogin', () => {
    it('should pass validation with valid login data', async () => {
      const req = {
        body: {
          email: 'test@example.com',
          password: 'password123',
        },
      } as Request;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;
      const next = vi.fn();

      for (const validator of validateLogin) {
        if (typeof validator === 'function') {
          await validator(req, res, next);
        } else {
          await validator.run(req);
        }
      }

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should fail validation with invalid email', async () => {
      const req = {
        body: {
          email: 'not-an-email',
          password: 'password123',
        },
      } as Request;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;
      const next = vi.fn();

      for (const validator of validateLogin) {
        if (typeof validator === 'function') {
          await validator(req, res, next);
        } else {
          await validator.run(req);
        }
      }

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should fail validation with empty password', async () => {
      const req = {
        body: {
          email: 'test@example.com',
          password: '',
        },
      } as Request;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;
      const next = vi.fn();

      for (const validator of validateLogin) {
        if (typeof validator === 'function') {
          await validator(req, res, next);
        } else {
          await validator.run(req);
        }
      }

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            details: expect.objectContaining({
              password: expect.arrayContaining([expect.stringContaining('required')]),
            }),
          }),
        })
      );
    });
  });

  describe('validatePasswordReset', () => {
    it('should pass validation with valid reset data', async () => {
      const req = {
        body: {
          token: 'a'.repeat(64),
          password: 'newpassword123',
        },
      } as Request;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;
      const next = vi.fn();

      for (const validator of validatePasswordReset) {
        if (typeof validator === 'function') {
          await validator(req, res, next);
        } else {
          await validator.run(req);
        }
      }

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should fail validation with invalid token length', async () => {
      const req = {
        body: {
          token: 'short-token',
          password: 'newpassword123',
        },
      } as Request;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;
      const next = vi.fn();

      for (const validator of validatePasswordReset) {
        if (typeof validator === 'function') {
          await validator(req, res, next);
        } else {
          await validator.run(req);
        }
      }

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            details: expect.objectContaining({
              token: expect.arrayContaining([expect.stringContaining('Invalid reset token')]),
            }),
          }),
        })
      );
    });

    it('should fail validation with short password', async () => {
      const req = {
        body: {
          token: 'a'.repeat(64),
          password: 'short',
        },
      } as Request;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;
      const next = vi.fn();

      for (const validator of validatePasswordReset) {
        if (typeof validator === 'function') {
          await validator(req, res, next);
        } else {
          await validator.run(req);
        }
      }

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('validateForgotPassword', () => {
    it('should pass validation with valid email', async () => {
      const req = {
        body: {
          email: 'test@example.com',
        },
      } as Request;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;
      const next = vi.fn();

      for (const validator of validateForgotPassword) {
        if (typeof validator === 'function') {
          await validator(req, res, next);
        } else {
          await validator.run(req);
        }
      }

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should fail validation with invalid email', async () => {
      const req = {
        body: {
          email: 'invalid-email',
        },
      } as Request;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;
      const next = vi.fn();

      for (const validator of validateForgotPassword) {
        if (typeof validator === 'function') {
          await validator(req, res, next);
        } else {
          await validator.run(req);
        }
      }

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            details: expect.objectContaining({
              email: expect.arrayContaining([expect.stringContaining('Invalid email')]),
            }),
          }),
        })
      );
    });
  });
});
