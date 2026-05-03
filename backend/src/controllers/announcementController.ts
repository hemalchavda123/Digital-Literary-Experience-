import { Request, Response } from 'express';
import prisma from '../config/db';
import { getIo } from '../socket';

/**
 * Get all announcements for a project
 * GET /api/projects/:projectId/announcements
 */
export const getAnnouncements = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const projectId = req.params.projectId as string;

    // Check if user has access to the project
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { ownerId: userId },
          { members: { some: { userId } } }
        ]
      }
    });

    if (!project) {
      res.status(404).json({ error: 'Project not found or access denied' });
      return;
    }

    const announcements = await prisma.announcement.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      include: {
        replies: {
          orderBy: { createdAt: 'asc' },
          include: {
            user: { select: { username: true } }
          }
        }
      }
    });

    res.json(announcements);
  } catch (error) {
    console.error('Error fetching announcements:', error);
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
};

/**
 * Create a new announcement (only owner)
 * POST /api/projects/:projectId/announcements
 * Body: { content }
 */
export const createAnnouncement = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const projectId = req.params.projectId as string;
    const { content } = req.body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      res.status(400).json({ error: 'Announcement content is required' });
      return;
    }

    // Verify ownership
    const project = await prisma.project.findFirst({
      where: { id: projectId, ownerId: userId },
    });

    if (!project) {
      res.status(403).json({ error: 'Only project owner can create announcements' });
      return;
    }

    const announcement = await prisma.announcement.create({
      data: {
        projectId,
        content: content.trim(),
      },
      include: { replies: true }
    });

    try {
      getIo().to(`project:${projectId}`).emit('announcement_created', announcement);
    } catch (e) {
      console.log('Socket not initialized, skipping emit');
    }

    res.status(201).json(announcement);
  } catch (error) {
    console.error('Error creating announcement:', error);
    res.status(500).json({ error: 'Failed to create announcement' });
  }
};

/**
 * Delete an announcement (only owner)
 * DELETE /api/projects/:projectId/announcements/:announcementId
 */
export const deleteAnnouncement = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const projectId = req.params.projectId as string;
    const announcementId = req.params.announcementId as string;

    // Verify ownership
    const project = await prisma.project.findFirst({
      where: { id: projectId, ownerId: userId },
    });

    if (!project) {
      res.status(403).json({ error: 'Only project owner can delete announcements' });
      return;
    }

    const announcement = await prisma.announcement.findFirst({
      where: { id: announcementId, projectId },
    });

    if (!announcement) {
      res.status(404).json({ error: 'Announcement not found' });
      return;
    }

    await prisma.announcement.delete({ where: { id: announcementId } });

    try {
      getIo().to(`project:${projectId}`).emit('announcement_deleted', announcementId);
    } catch (e) {}

    res.json({ message: 'Announcement deleted successfully' });
  } catch (error) {
    console.error('Error deleting announcement:', error);
    res.status(500).json({ error: 'Failed to delete announcement' });
  }
};

/**
 * Create a new reply to an announcement
 * POST /api/projects/:projectId/announcements/:announcementId/replies
 * Body: { content }
 */
export const createAnnouncementReply = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const projectId = req.params.projectId as string;
    const announcementId = req.params.announcementId as string;
    const { content } = req.body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      res.status(400).json({ error: 'Reply content is required' });
      return;
    }

    // Check if user has access to the project
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { ownerId: userId },
          { members: { some: { userId } } }
        ]
      }
    });

    if (!project) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    // Check if announcement exists
    const announcement = await prisma.announcement.findFirst({
      where: { id: announcementId, projectId }
    });

    if (!announcement) {
      res.status(404).json({ error: 'Announcement not found' });
      return;
    }

    const reply = await prisma.announcementReply.create({
      data: {
        announcementId,
        userId,
        content: content.trim(),
      },
      include: {
        user: { select: { username: true } }
      }
    });

    try {
      getIo().to(`project:${projectId}`).emit('reply_added', { announcementId, reply });
    } catch (e) {}

    res.status(201).json(reply);
  } catch (error) {
    console.error('Error creating reply:', error);
    res.status(500).json({ error: 'Failed to create reply' });
  }
};

/**
 * Delete a reply (only reply author or project owner)
 * DELETE /api/projects/:projectId/announcements/:announcementId/replies/:replyId
 */
export const deleteAnnouncementReply = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const projectId = req.params.projectId as string;
    const announcementId = req.params.announcementId as string;
    const replyId = req.params.replyId as string;

    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { ownerId: userId },
          { members: { some: { userId } } }
        ]
      }
    });

    if (!project) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const reply = await prisma.announcementReply.findFirst({
      where: { id: replyId, announcementId }
    });

    if (!reply) {
      res.status(404).json({ error: 'Reply not found' });
      return;
    }

    if (reply.userId !== userId && project.ownerId !== userId) {
      res.status(403).json({ error: 'Only the author or project owner can delete this reply' });
      return;
    }

    await prisma.announcementReply.delete({ where: { id: replyId } });

    try {
      getIo().to(`project:${projectId}`).emit('reply_deleted', { announcementId, replyId });
    } catch (e) {}

    res.json({ message: 'Reply deleted successfully' });
  } catch (error) {
    console.error('Error deleting reply:', error);
    res.status(500).json({ error: 'Failed to delete reply' });
  }
};
