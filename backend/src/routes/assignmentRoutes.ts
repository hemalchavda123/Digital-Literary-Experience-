import { Router } from 'express';
import {
  getAssignments,
  createAssignment,
  updateAssignmentStatus,
  deleteAssignment,
} from '../controllers/assignmentController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router({ mergeParams: true });

router.use(authMiddleware);

router.get('/', getAssignments);
router.post('/', createAssignment);
router.delete('/:assignmentId', deleteAssignment);
router.patch('/:assignmentId/statuses/:userId', updateAssignmentStatus);

export default router;
