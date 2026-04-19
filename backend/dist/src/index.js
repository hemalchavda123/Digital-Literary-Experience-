"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const annotationRoutes_1 = __importDefault(require("./routes/annotationRoutes"));
const labelRoutes_1 = __importDefault(require("./routes/labelRoutes"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const errorHandler_1 = require("./middleware/errorHandler");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Routes
app.use('/api/annotations', annotationRoutes_1.default);
app.use('/api/labels', labelRoutes_1.default);
app.use('/api/auth', authRoutes_1.default);
// Error handling middleware (must be last)
app.use(errorHandler_1.errorHandler);
// Start server (Prisma connects lazily on first query)
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
