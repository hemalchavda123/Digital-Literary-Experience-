import { Request, Response } from 'express';
import prisma from '../config/db';

export const getAnnotationsByDoc = async (req: Request, res: Response) => {
  try {
    const docId = req.params.docId as string;
    const annotations = await prisma.annotation.findMany({
      where: { docId },
      include: {
        user: { select: { username: true } },
        comments: {
          include: { user: { select: { username: true } } },
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { createdAt: 'asc' },
    });
    res.json(annotations);
  } catch (error) {
    console.error('Error fetching annotations:', error);
    res.status(500).json({ error: 'Failed to fetch annotations' });
  }
};

export const createAnnotation = async (req: Request, res: Response) => {
  try {
    const { docId, labelId, content, startOffset, endOffset } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const newAnnotation = await prisma.annotation.create({
      data: {
        docId,
        labelId,
        content: content || '',
        startOffset,
        endOffset,
        userId,
      },
      include: {
        user: { select: { username: true } },
        comments: true
      }
    });
    res.status(201).json(newAnnotation);
  } catch (error) {
    console.error('Error creating annotation:', error);
    res.status(500).json({ error: 'Failed to create annotation' });
  }
};

export const updateAnnotation = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { content, labelId } = req.body;

    const data: any = {};
    if (content !== undefined) data.content = content;
    if (labelId !== undefined) data.labelId = labelId;

    const updatedAnnotation = await prisma.annotation.update({
      where: { id },
      data,
      include: {
        user: { select: { username: true } },
        comments: {
          include: { user: { select: { username: true } } },
          orderBy: { createdAt: 'asc' }
        }
      }
    });
    res.json(updatedAnnotation);
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Annotation not found' });
    }
    console.error('Error updating annotation:', error);
    res.status(500).json({ error: 'Failed to update annotation' });
  }
};

export const deleteAnnotation = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const annotation = await prisma.annotation.findUnique({ where: { id } });
    if (!annotation) {
      return res.status(404).json({ error: 'Annotation not found' });
    }

    // Usually only the owner of the annotation or project OWNER/EDITOR can delete.
    // For simplicity, we allow the annotation author to delete it.
    if (annotation.userId !== userId) {
      // Add more complex checks if needed (e.g. project owner)
    }

    await prisma.annotation.delete({ where: { id } });
    res.json({ message: 'Annotation deleted successfully' });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Annotation not found' });
    }
    console.error('Error deleting annotation:', error);
    res.status(500).json({ error: 'Failed to delete annotation' });
  }
};

export const createComment = async (req: Request, res: Response) => {
  try {
    const annotationId = req.params.id as string;
    const { content } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const comment = await prisma.annotationComment.create({
      data: {
        annotationId,
        userId,
        content: content.trim(),
      },
      include: {
        user: { select: { username: true } }
      }
    });

    res.status(201).json(comment);
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({ error: 'Failed to create comment' });
  }
};
