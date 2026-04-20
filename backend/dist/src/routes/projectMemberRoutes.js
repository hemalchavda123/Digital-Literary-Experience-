"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const projectMemberController_1 = require("../controllers/projectMemberController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)({ mergeParams: true });
// All routes require authentication
router.use(authMiddleware_1.authMiddleware);
// Link-based invite routes
router.post('/:projectId/invites', projectMemberController_1.createInviteLink);
router.post('/join/:token', projectMemberController_1.joinProjectViaLink);
// Member management
router.get('/:projectId/members', projectMemberController_1.getProjectMembers);
router.put('/:projectId/members/:memberId', projectMemberController_1.updateMemberRole);
router.delete('/:projectId/members/:memberId', projectMemberController_1.removeProjectMember);
exports.default = router;
