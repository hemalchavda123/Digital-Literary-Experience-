import { Router } from 'express';
import { adminLogin } from '../controllers/authController';
import { adminMiddleware, superAdminMiddleware } from '../middleware/authMiddleware';
import {
  getAdminStats,
  getAdminProjects,
  updateProjectAccessRules,
  getAdminUsers,
  updateUserSystemRole,
  getPlatformSettings,
  updatePlatformSetting,
} from '../controllers/adminController';

const router = Router();

// Public Admin Auth
router.post('/login', adminLogin);

// Protected Admin Endpoints (ADMIN and SUPERADMIN)
router.get('/stats', adminMiddleware, getAdminStats);
router.get('/projects', adminMiddleware, getAdminProjects);
router.patch('/projects/:projectId/access-rules', adminMiddleware, updateProjectAccessRules);

// Protected Superadmin-Only Endpoints
router.get('/users', superAdminMiddleware, getAdminUsers);
router.patch('/users/:userId/role', superAdminMiddleware, updateUserSystemRole);
router.get('/settings', superAdminMiddleware, getPlatformSettings);
router.post('/settings', superAdminMiddleware, updatePlatformSetting);

export default router;
