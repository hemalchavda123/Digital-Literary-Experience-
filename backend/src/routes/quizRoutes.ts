import { Router } from 'express';
import {
  getQuizzes,
  getQuizById,
  createQuiz,
  updateQuiz,
  deleteQuiz,
  togglePublishQuestion,
  submitQuiz,
  getMySubmission,
  getSubmissions,
  getQuizAnalytics,
  getPdfQuizAnalytics,
  exportQuizAnswersExcel,
} from '../controllers/quizController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router({ mergeParams: true });

// All quiz routes require authentication
router.use(authMiddleware);

// Routes
router.get('/', getQuizzes);
router.post('/', createQuiz);
router.get('/document/:docId/analytics', getPdfQuizAnalytics);
router.get('/:quizId', getQuizById);
router.put('/:quizId', updateQuiz);
router.patch('/:quizId/questions/:questionId/publish', togglePublishQuestion);
router.delete('/:quizId', deleteQuiz);

// Submissions
router.get('/:quizId/my-submission', getMySubmission);
router.post('/:quizId/submit', submitQuiz);
router.get('/:quizId/submissions', getSubmissions);

// Analytics (Owner only)
router.get('/:quizId/analytics', getQuizAnalytics);

// Excel Export (Owner only, after quiz is closed)
router.get('/:quizId/export-excel', exportQuizAnswersExcel);
router.get('/:quizId/export', exportQuizAnswersExcel);

export default router;
