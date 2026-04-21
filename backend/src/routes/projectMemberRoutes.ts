import { Router } from 'express';
import {
  createInviteLink,
  joinProjectViaLink,
  getProjectMembers,
  removeProjectMember,
  updateMemberRole,
  inviteUserById,
  inviteUserByEmail
} from '../controllers/projectMemberController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router({ mergeParams: true });

// All routes require authentication
router.use(authMiddleware);

// Link-based invite routes
router.post('/:projectId/invites', createInviteLink);
router.post('/join/:token', joinProjectViaLink);

// Direct invite routes
router.post('/:projectId/invite-user', inviteUserById);
router.post('/:projectId/invite-email', inviteUserByEmail);

// Member management
router.get('/:projectId/members', getProjectMembers);
router.put('/:projectId/members/:memberId', updateMemberRole);
router.delete('/:projectId/members/:memberId', removeProjectMember);

export default router;
