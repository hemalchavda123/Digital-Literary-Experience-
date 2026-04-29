"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const validationMiddleware_1 = require("./validationMiddleware");
(0, vitest_1.describe)('Validation Middleware', () => {
    (0, vitest_1.describe)('validateRegistration', () => {
        (0, vitest_1.it)('should pass validation with valid registration data', async () => {
            const req = {
                body: {
                    email: 'test@example.com',
                    username: 'testuser',
                    password: 'password123',
                },
            };
            const res = {
                status: vitest_1.vi.fn().mockReturnThis(),
                json: vitest_1.vi.fn(),
            };
            const next = vitest_1.vi.fn();
            // Run all validation rules
            for (const validator of validationMiddleware_1.validateRegistration) {
                if (typeof validator === 'function') {
                    await validator(req, res, next);
                }
                else {
                    await validator.run(req);
                }
            }
            (0, vitest_1.expect)(next).toHaveBeenCalled();
            (0, vitest_1.expect)(res.status).not.toHaveBeenCalled();
        });
        (0, vitest_1.it)('should fail validation with invalid email', async () => {
            const req = {
                body: {
                    email: 'invalid-email',
                    username: 'testuser',
                    password: 'password123',
                },
            };
            const res = {
                status: vitest_1.vi.fn().mockReturnThis(),
                json: vitest_1.vi.fn(),
            };
            const next = vitest_1.vi.fn();
            for (const validator of validationMiddleware_1.validateRegistration) {
                if (typeof validator === 'function') {
                    await validator(req, res, next);
                }
                else {
                    await validator.run(req);
                }
            }
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(400);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
                error: vitest_1.expect.objectContaining({
                    message: 'Validation failed',
                    code: 'VALIDATION_ERROR',
                    details: vitest_1.expect.objectContaining({
                        email: vitest_1.expect.arrayContaining([vitest_1.expect.stringContaining('Invalid email')]),
                    }),
                }),
            }));
        });
        (0, vitest_1.it)('should fail validation with short username', async () => {
            const req = {
                body: {
                    email: 'test@example.com',
                    username: 'ab',
                    password: 'password123',
                },
            };
            const res = {
                status: vitest_1.vi.fn().mockReturnThis(),
                json: vitest_1.vi.fn(),
            };
            const next = vitest_1.vi.fn();
            for (const validator of validationMiddleware_1.validateRegistration) {
                if (typeof validator === 'function') {
                    await validator(req, res, next);
                }
                else {
                    await validator.run(req);
                }
            }
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(400);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
                error: vitest_1.expect.objectContaining({
                    details: vitest_1.expect.objectContaining({
                        username: vitest_1.expect.arrayContaining([
                            vitest_1.expect.stringContaining('between 3 and 30 characters'),
                        ]),
                    }),
                }),
            }));
        });
        (0, vitest_1.it)('should fail validation with short password', async () => {
            const req = {
                body: {
                    email: 'test@example.com',
                    username: 'testuser',
                    password: 'short',
                },
            };
            const res = {
                status: vitest_1.vi.fn().mockReturnThis(),
                json: vitest_1.vi.fn(),
            };
            const next = vitest_1.vi.fn();
            for (const validator of validationMiddleware_1.validateRegistration) {
                if (typeof validator === 'function') {
                    await validator(req, res, next);
                }
                else {
                    await validator.run(req);
                }
            }
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(400);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
                error: vitest_1.expect.objectContaining({
                    details: vitest_1.expect.objectContaining({
                        password: vitest_1.expect.arrayContaining([
                            vitest_1.expect.stringContaining('at least 8 characters'),
                        ]),
                    }),
                }),
            }));
        });
    });
    (0, vitest_1.describe)('validateLogin', () => {
        (0, vitest_1.it)('should pass validation with valid login data', async () => {
            const req = {
                body: {
                    email: 'test@example.com',
                    password: 'password123',
                },
            };
            const res = {
                status: vitest_1.vi.fn().mockReturnThis(),
                json: vitest_1.vi.fn(),
            };
            const next = vitest_1.vi.fn();
            for (const validator of validationMiddleware_1.validateLogin) {
                if (typeof validator === 'function') {
                    await validator(req, res, next);
                }
                else {
                    await validator.run(req);
                }
            }
            (0, vitest_1.expect)(next).toHaveBeenCalled();
            (0, vitest_1.expect)(res.status).not.toHaveBeenCalled();
        });
        (0, vitest_1.it)('should fail validation with invalid email', async () => {
            const req = {
                body: {
                    email: 'not-an-email',
                    password: 'password123',
                },
            };
            const res = {
                status: vitest_1.vi.fn().mockReturnThis(),
                json: vitest_1.vi.fn(),
            };
            const next = vitest_1.vi.fn();
            for (const validator of validationMiddleware_1.validateLogin) {
                if (typeof validator === 'function') {
                    await validator(req, res, next);
                }
                else {
                    await validator.run(req);
                }
            }
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(400);
        });
        (0, vitest_1.it)('should fail validation with empty password', async () => {
            const req = {
                body: {
                    email: 'test@example.com',
                    password: '',
                },
            };
            const res = {
                status: vitest_1.vi.fn().mockReturnThis(),
                json: vitest_1.vi.fn(),
            };
            const next = vitest_1.vi.fn();
            for (const validator of validationMiddleware_1.validateLogin) {
                if (typeof validator === 'function') {
                    await validator(req, res, next);
                }
                else {
                    await validator.run(req);
                }
            }
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(400);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
                error: vitest_1.expect.objectContaining({
                    details: vitest_1.expect.objectContaining({
                        password: vitest_1.expect.arrayContaining([vitest_1.expect.stringContaining('required')]),
                    }),
                }),
            }));
        });
    });
    (0, vitest_1.describe)('validatePasswordReset', () => {
        (0, vitest_1.it)('should pass validation with valid reset data', async () => {
            const req = {
                body: {
                    token: 'a'.repeat(64),
                    password: 'newpassword123',
                },
            };
            const res = {
                status: vitest_1.vi.fn().mockReturnThis(),
                json: vitest_1.vi.fn(),
            };
            const next = vitest_1.vi.fn();
            for (const validator of validationMiddleware_1.validatePasswordReset) {
                if (typeof validator === 'function') {
                    await validator(req, res, next);
                }
                else {
                    await validator.run(req);
                }
            }
            (0, vitest_1.expect)(next).toHaveBeenCalled();
            (0, vitest_1.expect)(res.status).not.toHaveBeenCalled();
        });
        (0, vitest_1.it)('should fail validation with invalid token length', async () => {
            const req = {
                body: {
                    token: 'short-token',
                    password: 'newpassword123',
                },
            };
            const res = {
                status: vitest_1.vi.fn().mockReturnThis(),
                json: vitest_1.vi.fn(),
            };
            const next = vitest_1.vi.fn();
            for (const validator of validationMiddleware_1.validatePasswordReset) {
                if (typeof validator === 'function') {
                    await validator(req, res, next);
                }
                else {
                    await validator.run(req);
                }
            }
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(400);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
                error: vitest_1.expect.objectContaining({
                    details: vitest_1.expect.objectContaining({
                        token: vitest_1.expect.arrayContaining([vitest_1.expect.stringContaining('Invalid reset token')]),
                    }),
                }),
            }));
        });
        (0, vitest_1.it)('should fail validation with short password', async () => {
            const req = {
                body: {
                    token: 'a'.repeat(64),
                    password: 'short',
                },
            };
            const res = {
                status: vitest_1.vi.fn().mockReturnThis(),
                json: vitest_1.vi.fn(),
            };
            const next = vitest_1.vi.fn();
            for (const validator of validationMiddleware_1.validatePasswordReset) {
                if (typeof validator === 'function') {
                    await validator(req, res, next);
                }
                else {
                    await validator.run(req);
                }
            }
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(400);
        });
    });
    (0, vitest_1.describe)('validateForgotPassword', () => {
        (0, vitest_1.it)('should pass validation with valid email', async () => {
            const req = {
                body: {
                    email: 'test@example.com',
                },
            };
            const res = {
                status: vitest_1.vi.fn().mockReturnThis(),
                json: vitest_1.vi.fn(),
            };
            const next = vitest_1.vi.fn();
            for (const validator of validationMiddleware_1.validateForgotPassword) {
                if (typeof validator === 'function') {
                    await validator(req, res, next);
                }
                else {
                    await validator.run(req);
                }
            }
            (0, vitest_1.expect)(next).toHaveBeenCalled();
            (0, vitest_1.expect)(res.status).not.toHaveBeenCalled();
        });
        (0, vitest_1.it)('should fail validation with invalid email', async () => {
            const req = {
                body: {
                    email: 'invalid-email',
                },
            };
            const res = {
                status: vitest_1.vi.fn().mockReturnThis(),
                json: vitest_1.vi.fn(),
            };
            const next = vitest_1.vi.fn();
            for (const validator of validationMiddleware_1.validateForgotPassword) {
                if (typeof validator === 'function') {
                    await validator(req, res, next);
                }
                else {
                    await validator.run(req);
                }
            }
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(400);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
                error: vitest_1.expect.objectContaining({
                    details: vitest_1.expect.objectContaining({
                        email: vitest_1.expect.arrayContaining([vitest_1.expect.stringContaining('Invalid email')]),
                    }),
                }),
            }));
        });
    });
});
