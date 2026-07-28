import { Router } from 'express';
import {
  getQuizzes,
  getQuizById,
  createQuiz,
  updateQuiz,
  deleteQuiz,
  submitQuiz,
  getSubmissions
} from '../controllers/quizController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router({ mergeParams: true });

// All quiz routes require authentication
router.use(authMiddleware);

// Routes
router.get('/', getQuizzes);
router.post('/', createQuiz);
router.get('/:quizId', getQuizById);
router.put('/:quizId', updateQuiz);
router.delete('/:quizId', deleteQuiz);

// Student submits a quiz
router.post('/:quizId/submit', submitQuiz);

// Owner views all submissions
router.get('/:quizId/submissions', getSubmissions);

export default router;
