import { Router } from 'express';
import {
  getAnnotationsByDoc,
  createAnnotation,
  updateAnnotation,
  deleteAnnotation,
  createComment,
} from '../controllers/annotationController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.use(authMiddleware);

router.get('/doc/:docId', getAnnotationsByDoc);
router.post('/', createAnnotation);
router.put('/:id', updateAnnotation);
router.delete('/:id', deleteAnnotation);
router.post('/:id/comments', createComment);

export default router;
