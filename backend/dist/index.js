"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const annotationRoutes_1 = __importDefault(require("./routes/annotationRoutes"));
const labelRoutes_1 = __importDefault(require("./routes/labelRoutes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Routes
app.use('/api/annotations', annotationRoutes_1.default);
app.use('/api/labels', labelRoutes_1.default);
// Start server (Prisma connects lazily on first query)
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
