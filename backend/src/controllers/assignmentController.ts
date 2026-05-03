import { Request, Response } from 'express';
import prisma from '../config/db';
import { getIo } from '../socket';

export const getAssignments = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const projectId = req.params.projectId as string;

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

    const isOwner = project.ownerId === userId;

    const assignments = await prisma.assignment.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      include: {
        statuses: {
          // Owner sees all statuses; members only see their own
          where: isOwner ? {} : { userId },
          include: { user: { select: { username: true } } }
        }
      }
    });

    res.json(assignments);
  } catch (error) {
    console.error('Error fetching assignments:', error);
    res.status(500).json({ error: 'Failed to fetch assignments' });
  }
};

export const createAssignment = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const projectId = req.params.projectId as string;
    const { title, description, dueDate, totalMarks } = req.body;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      res.status(400).json({ error: 'Assignment title is required' });
      return;
    }

    const project = await prisma.project.findFirst({
      where: { id: projectId, ownerId: userId },
      include: { members: true }
    });

    if (!project) {
      res.status(403).json({ error: 'Only project owner can create assignments' });
      return;
    }

    // Only project members (not the owner) get statuses
    const memberIds = project.members.map((m) => m.userId);

    const assignment = await prisma.assignment.create({
      data: {
        projectId,
        title: title.trim(),
        description: description?.trim() || "",
        dueDate: dueDate ? new Date(dueDate) : null,
        totalMarks: totalMarks ? parseInt(totalMarks, 10) : 100,
        statuses: {
          create: memberIds.map((memberId) => ({
            userId: memberId,
            status: "PENDING"
          }))
        }
      },
      include: {
        statuses: {
          include: { user: { select: { username: true } } }
        }
      }
    });

    try {
      getIo().to(`project:${projectId}`).emit('assignment_created', assignment);
    } catch (e) {}

    res.status(201).json(assignment);
  } catch (error) {
    console.error('Error creating assignment:', error);
    res.status(500).json({ error: 'Failed to create assignment' });
  }
};

export const updateAssignmentStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const projectId = req.params.projectId as string;
    const assignmentId = req.params.assignmentId as string;
    const targetUserId = req.params.userId as string;
    const { status, grade } = req.body;

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

    const isOwner = project.ownerId === userId;
    const isSelf = targetUserId === userId;

    if (!isOwner && !isSelf) {
      res.status(403).json({ error: 'Cannot update another user status unless you are the owner' });
      return;
    }

    // Users can only update their own status to SUBMITTED or PENDING, but not give grades
    let updateData: any = {};
    if (isSelf && !isOwner) {
      if (status !== undefined) {
        if (['PENDING', 'SUBMITTED'].includes(status)) {
          updateData.status = status;
        } else {
          res.status(403).json({ error: 'Users can only set status to PENDING or SUBMITTED' });
          return;
        }
      }
      // Ignored grade changes from non-owners
    } else if (isOwner) {
      if (status !== undefined) updateData.status = status;
      if (grade !== undefined) updateData.grade = grade;
    }

    if (Object.keys(updateData).length === 0) {
      res.status(400).json({ error: 'No valid fields to update' });
      return;
    }

    const assignmentStatus = await prisma.assignmentStatus.update({
      where: {
        assignmentId_userId: {
          assignmentId,
          userId: targetUserId
        }
      },
      data: updateData,
      include: {
        user: { select: { username: true } }
      }
    });

    try {
      getIo().to(`project:${projectId}`).emit('assignment_status_updated', {
        assignmentId,
        status: assignmentStatus
      });
    } catch (e) {}

    res.json(assignmentStatus);
  } catch (error) {
    console.error('Error updating assignment status:', error);
    res.status(500).json({ error: 'Failed to update assignment status' });
  }
};

export const deleteAssignment = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const projectId = req.params.projectId as string;
    const assignmentId = req.params.assignmentId as string;

    const project = await prisma.project.findFirst({
      where: { id: projectId, ownerId: userId },
    });

    if (!project) {
      res.status(403).json({ error: 'Only project owner can delete assignments' });
      return;
    }

    await prisma.assignment.delete({
      where: { id: assignmentId }
    });

    try {
      getIo().to(`project:${projectId}`).emit('assignment_deleted', assignmentId);
    } catch (e) {}

    res.json({ message: 'Assignment deleted successfully' });
  } catch (error) {
    console.error('Error deleting assignment:', error);
    res.status(500).json({ error: 'Failed to delete assignment' });
  }
};
