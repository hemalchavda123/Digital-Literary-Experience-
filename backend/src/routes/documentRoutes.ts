import { Router } from 'express';
import {
  getDocumentsByProject,
  getDocumentById,
  createDocument,
  importGoogleDriveDocument,
  updateDocument,
  deleteDocument,
} from '../controllers/documentController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.use(authMiddleware);

router.get('/project/:projectId', getDocumentsByProject);
router.get('/:id', getDocumentById);
router.post('/', createDocument);
router.post('/import-google-drive', importGoogleDriveDocument);
router.put('/:id', updateDocument);
router.delete('/:id', deleteDocument);

export default router;
