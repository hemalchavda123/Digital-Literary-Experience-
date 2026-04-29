"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const annotationRoutes_1 = __importDefault(require("./routes/annotationRoutes"));
const labelRoutes_1 = __importDefault(require("./routes/labelRoutes"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const projectRoutes_1 = __importDefault(require("./routes/projectRoutes"));
const documentRoutes_1 = __importDefault(require("./routes/documentRoutes"));
const projectMemberRoutes_1 = __importDefault(require("./routes/projectMemberRoutes"));
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const errorHandler_1 = require("./middleware/errorHandler");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// Security headers
app.use((0, helmet_1.default)({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
    },
}));
// Rate limiting
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // limit each IP to 1000 requests per windowMs (increased for development)
    message: 'Too many requests from this IP, please try again later.',
    skip: (req) => process.env.NODE_ENV === 'development', // Skip rate limiting in development
});
// Stricter rate limiting for auth endpoints
const authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs (increased for development)
    message: 'Too many authentication attempts, please try again later.',
    skip: (req) => process.env.NODE_ENV === 'development', // Skip rate limiting in development
});
app.use(limiter);
const allowedOrigins = (process.env.CORS_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:3000')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
app.use((0, cors_1.default)({
    origin: (origin, cb) => {
        // Allow non-browser or same-origin requests (no Origin header)
        if (!origin)
            return cb(null, true);
        if (allowedOrigins.includes(origin))
            return cb(null, true);
        // Also allow Vercel preview deployment URLs for this project
        if (origin.match(/^https:\/\/digital-literary-experience.*\.vercel\.app$/))
            return cb(null, true);
        return cb(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
}));
app.use(express_1.default.json({ limit: '1mb' }));
app.use(express_1.default.urlencoded({ limit: '1mb', extended: true }));
// Routes
app.use('/api/users', userRoutes_1.default);
app.use('/api/annotations', annotationRoutes_1.default);
app.use('/api/labels', labelRoutes_1.default);
app.use('/api/auth', authLimiter, authRoutes_1.default);
app.use('/api/projects', projectRoutes_1.default);
app.use('/api/projects', projectMemberRoutes_1.default);
app.use('/api/documents', documentRoutes_1.default);
// Error handling middleware (must be last)
app.use(errorHandler_1.errorHandler);
// Export app for Vercel serverless functions
exports.default = app;
// Start server only in local development (Vercel handles its own invocation)
if (process.env.VERCEL !== '1') {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}
