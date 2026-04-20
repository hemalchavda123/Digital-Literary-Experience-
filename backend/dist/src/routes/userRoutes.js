"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const userController_1 = require("../controllers/userController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
// All user routes require authentication
router.use(authMiddleware_1.authMiddleware);
router.get('/me', userController_1.getCurrentUser);
router.post('/profile-image', userController_1.updateProfileImage);
exports.default = router;
