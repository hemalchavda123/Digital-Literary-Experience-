import { Router } from 'express';
import { getAnnouncements, createAnnouncement, deleteAnnouncement, createAnnouncementReply, deleteAnnouncementReply } from '../controllers/announcementController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router({ mergeParams: true });

// Apply auth middleware to all announcement routes
router.use(authMiddleware);

router.get('/', getAnnouncements);
router.post('/', createAnnouncement);
router.delete('/:announcementId', deleteAnnouncement);
router.post('/:announcementId/replies', createAnnouncementReply);
router.delete('/:announcementId/replies/:replyId', deleteAnnouncementReply);

export default router;
