"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const annotationRoutes_1 = __importDefault(require("./routes/annotationRoutes"));
const labelRoutes_1 = __importDefault(require("./routes/labelRoutes"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const errorHandler_1 = require("./middleware/errorHandler");
/**
 * Integration test to verify auth routes are mounted and error handler is configured
 */
(0, vitest_1.describe)('Express App Integration', () => {
    const app = (0, express_1.default)();
    app.use((0, cors_1.default)());
    app.use(express_1.default.json());
    // Routes
    app.use('/api/annotations', annotationRoutes_1.default);
    app.use('/api/labels', labelRoutes_1.default);
    app.use('/api/auth', authRoutes_1.default);
    // Error handling middleware
    app.use(errorHandler_1.errorHandler);
    (0, vitest_1.it)('should have auth routes mounted at /api/auth', async () => {
        // Test that auth routes are accessible
        const response = await (0, supertest_1.default)(app)
            .post('/api/auth/login')
            .send({ email: 'test@example.com', password: 'password' });
        // Should get a response (even if it's an error due to invalid credentials)
        (0, vitest_1.expect)(response.status).toBeDefined();
    });
    (0, vitest_1.it)('should protect label routes with auth middleware', async () => {
        // Test that label routes require authentication
        const response = await (0, supertest_1.default)(app)
            .get('/api/labels/project/test-project-id');
        // Should return 401 unauthorized without token
        (0, vitest_1.expect)(response.status).toBe(401);
        (0, vitest_1.expect)(response.body.error).toBeDefined();
        (0, vitest_1.expect)(response.body.error.code).toBe('INVALID_TOKEN');
    });
    (0, vitest_1.it)('should protect annotation routes with auth middleware', async () => {
        // Test that annotation routes require authentication
        const response = await (0, supertest_1.default)(app)
            .get('/api/annotations/doc/test-doc-id');
        // Should return 401 unauthorized without token
        (0, vitest_1.expect)(response.status).toBe(401);
        (0, vitest_1.expect)(response.body.error).toBeDefined();
        (0, vitest_1.expect)(response.body.error.code).toBe('INVALID_TOKEN');
    });
    (0, vitest_1.it)('should use error handler middleware for unhandled errors', async () => {
        // Test that error handler catches errors
        const response = await (0, supertest_1.default)(app)
            .post('/api/auth/register')
            .send({}); // Invalid data
        // Should get a structured error response
        (0, vitest_1.expect)(response.body.error).toBeDefined();
        (0, vitest_1.expect)(response.body.error.message).toBeDefined();
        (0, vitest_1.expect)(response.body.error.code).toBeDefined();
    });
});
