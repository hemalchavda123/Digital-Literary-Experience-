import { Router } from 'express';
import {
  getAnnotationsByDoc,
  createAnnotation,
  updateAnnotation,
  deleteAnnotation,
  createComment,
  updateComment,
  deleteComment,
  streamAnnotationEvents,
  createStreamToken,
} from '../controllers/annotationController';
import { authMiddleware } from '../middleware/authMiddleware';
import { sseAuthMiddleware } from '../middleware/sseAuthMiddleware';

const router = Router();

// SSE stream (must be registered before authMiddleware, since EventSource can't set headers)
router.get('/stream/doc/:docId', sseAuthMiddleware, streamAnnotationEvents);

router.use(authMiddleware);

router.get('/doc/:docId', getAnnotationsByDoc);
router.post('/stream-token', createStreamToken);
router.post('/', createAnnotation);
router.put('/:id', updateAnnotation);
router.delete('/:id', deleteAnnotation);
router.post('/:id/comments', createComment);
router.put('/comments/:commentId', updateComment);
router.delete('/comments/:commentId', deleteComment);

export default router;
