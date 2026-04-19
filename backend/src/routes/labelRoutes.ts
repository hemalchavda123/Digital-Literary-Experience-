import { Router } from 'express';
import {
  getLabelsByProject,
  createLabel,
  updateLabel,
  deleteLabel,
} from '../controllers/labelController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.use(authMiddleware);

router.get('/project/:projectId', getLabelsByProject);
router.post('/', createLabel);
router.put('/:id', updateLabel);
router.delete('/:id', deleteLabel);

export default router;
