import { Request, Response } from 'express';
import prisma from '../config/db';

export const getLabelsByProject = async (req: Request, res: Response) => {
  try {
    const projectId = req.params.projectId as string;
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
    const newLabel = await prisma.label.create({
      data: {
        projectId,
        name,
        color,
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
    await prisma.label.delete({ where: { id } });
    res.json({ message: 'Label deleted successfully' });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Label not found' });
    }
    res.status(500).json({ error: 'Failed to delete label' });
  }
};
