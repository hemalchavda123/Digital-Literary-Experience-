"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
// Annotation model is now defined in prisma/schema.prisma
// This file re-exports the Prisma client for backward compatibility
var db_1 = require("../config/db");
Object.defineProperty(exports, "prisma", { enumerable: true, get: function () { return __importDefault(db_1).default; } });
