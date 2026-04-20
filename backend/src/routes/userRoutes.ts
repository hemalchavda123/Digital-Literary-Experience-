import { Router } from 'express';
import { updateProfileImage, getCurrentUser } from '../controllers/userController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// All user routes require authentication
router.use(authMiddleware);

router.get('/me', getCurrentUser);
router.post('/profile-image', updateProfileImage);

export default router;
