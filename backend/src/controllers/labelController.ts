import { Request, Response } from 'express';
import prisma from '../config/db';

export const getLabelsByProject = async (req: Request, res: Response) => {
  try {
    const projectId = req.params.projectId as string;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Verify ownership or membership
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { ownerId: userId },
          { members: { some: { userId } } }
        ]
      },
    });

    if (!project) {
      return res.status(403).json({ error: 'Unauthorized to view labels for this project' });
    }

    const labels = await prisma.label.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
    });
    res.json(labels);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch labels' });
  }
};

export const createLabel = async (req: Request, res: Response) => {
  try {
    const { projectId, name, color } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Only OWNER can create labels
    const project = await prisma.project.findFirst({
      where: { id: projectId, ownerId: userId },
    });

    if (!project) {
      return res.status(403).json({ error: 'Only the project owner can create labels' });
    }

    const newLabel = await prisma.label.create({
      data: {
        projectId,
        name,
        color,
        userId,
      },
    });
    res.status(201).json(newLabel);
  } catch (error) {
    console.error('Error creating label:', error);
    res.status(500).json({ error: 'Failed to create label', details: String(error) });
  }
};

export const updateLabel = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { name, color } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const existing = await prisma.label.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Label not found' });
    }

    // Only OWNER can update labels
    const project = await prisma.project.findFirst({
      where: { id: existing.projectId, ownerId: userId },
    });

    if (!project) {
      return res.status(403).json({ error: 'Only the project owner can update labels' });
    }

    const data: any = {};
    if (name !== undefined) data.name = name;
    if (color !== undefined) data.color = color;

    const updatedLabel = await prisma.label.update({
      where: { id },
      data,
    });
    res.json(updatedLabel);
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Label not found' });
    }
    res.status(500).json({ error: 'Failed to update label' });
  }
};

export const deleteLabel = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const existing = await prisma.label.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Label not found' });
    }

    // Only OWNER can delete labels
    const project = await prisma.project.findFirst({
      where: { id: existing.projectId, ownerId: userId },
    });

    if (!project) {
      return res.status(403).json({ error: 'Only the project owner can delete labels' });
    }

    await prisma.label.delete({ where: { id } });
    res.json({ message: 'Label deleted successfully' });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Label not found' });
    }
    res.status(500).json({ error: 'Failed to delete label' });
  }
};
