import { Request, Response } from 'express';
import prisma from '../config/db';

export const getAnnotationsByDoc = async (req: Request, res: Response) => {
  try {
    const docId = req.params.docId as string;
    const annotations = await prisma.annotation.findMany({
      where: { docId },
      orderBy: { createdAt: 'asc' },
    });
    res.json(annotations);
  } catch (error) {
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
    });
    res.status(201).json(newAnnotation);
  } catch (error) {
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
    });
    res.json(updatedAnnotation);
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Annotation not found' });
    }
    res.status(500).json({ error: 'Failed to update annotation' });
  }
};

export const deleteAnnotation = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    await prisma.annotation.delete({ where: { id } });
    res.json({ message: 'Annotation deleted successfully' });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Annotation not found' });
    }
    res.status(500).json({ error: 'Failed to delete annotation' });
  }
};
