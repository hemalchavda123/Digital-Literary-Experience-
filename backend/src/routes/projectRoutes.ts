import { Router } from 'express';
import {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  updateMemberPermissions,
  updateDefaultPermissions,
} from '../controllers/projectController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.use(authMiddleware);

router.get('/', getProjects);
router.get('/:id', getProjectById);
router.post('/', createProject);
router.put('/:id', updateProject);
router.delete('/:id', deleteProject);
router.put('/:projectId/members/:userId/permissions', updateMemberPermissions);
router.put('/:projectId/default-permissions', updateDefaultPermissions);

export default router;
