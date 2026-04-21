import { Request, Response } from 'express';
import prisma from '../config/db';

/**
 * List documents for a project (verifies project ownership)
 * GET /api/documents/project/:projectId
 */
export const getDocumentsByProject = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const projectId = req.params.projectId as string;

    // Verify the user is owner or member
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
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const documents = await prisma.document.findMany({
      where: { projectId },
      orderBy: { updatedAt: 'desc' },
    });

    res.json(documents);
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
};

/**
 * Get a single document by ID (verifies project ownership)
 * GET /api/documents/:id
 */
export const getDocumentById = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const id = req.params.id as string;

    const document = await prisma.document.findUnique({
      where: { id },
    });

    if (!document) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }

    // Verify access through the project
    const project = await prisma.project.findFirst({
      where: {
        id: document.projectId,
        OR: [
          { ownerId: userId },
          { members: { some: { userId } } }
        ]
      },
    });

    if (!project) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }

    res.json(document);
  } catch (error) {
    console.error('Error fetching document:', error);
    res.status(500).json({ error: 'Failed to fetch document' });
  }
};

/**
 * Create a new document
 * POST /api/documents
 * Body: { projectId, title, kind?, content?, pdfUrl? }
 */
export const createDocument = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { projectId, title, kind, content, pdfUrl } = req.body;

    if (!projectId || !title) {
      res.status(400).json({ error: 'projectId and title are required' });
      return;
    }

    // Validate title length
    if (title.length > 500) {
      res.status(400).json({ error: 'Title must be less than 500 characters' });
      return;
    }

    // Validate kind if provided
    if (kind && kind !== 'text' && kind !== 'pdf') {
      res.status(400).json({ error: 'Kind must be either "text" or "pdf"' });
      return;
    }

    // Validate pdfUrl if provided
    if (pdfUrl) {
      if (typeof pdfUrl !== 'string') {
        res.status(400).json({ error: 'pdfUrl must be a string' });
        return;
      }
      
      // If it's a data URL, validate format
      if (pdfUrl.startsWith('data:')) {
        if (!pdfUrl.startsWith('data:application/pdf;base64,')) {
          res.status(400).json({ error: 'PDF data URL must be base64 encoded' });
          return;
        }
      } else {
        // If it's a regular URL, validate format
        try {
          const url = new URL(pdfUrl);
          if (!['http:', 'https:'].includes(url.protocol)) {
            res.status(400).json({ error: 'PDF URL must use HTTP or HTTPS protocol' });
            return;
          }
        } catch {
          res.status(400).json({ error: 'Invalid PDF URL format' });
          return;
        }
      }
    }

    // Verify project access (Owner or Editor)
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { ownerId: userId },
          { members: { some: { userId, role: 'EDITOR' } } }
        ]
      },
    });

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const document = await prisma.document.create({
      data: {
        title: title.trim(),
        projectId,
        kind: kind || 'text',
        content: content || '',
        pdfUrl: pdfUrl || null,
      },
    });

    // Touch the project's updatedAt
    await prisma.project.update({
      where: { id: projectId },
      data: { updatedAt: new Date() },
    });

    res.status(201).json(document);
  } catch (error) {
    console.error('Error creating document:', error);
    res.status(500).json({ error: 'Failed to create document' });
  }
};

/**
 * Update a document (title, content)
 * PUT /api/documents/:id
 * Body: { title?, content?, pdfUrl? }
 */
export const updateDocument = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const id = req.params.id as string;

    // Verify ownership via project
    const existing = await prisma.document.findUnique({
      where: { id },
    });

    if (!existing) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }

    const project = await prisma.project.findFirst({
      where: {
        id: existing.projectId,
        OR: [
          { ownerId: userId },
          { members: { some: { userId, role: 'EDITOR' } } }
        ]
      },
    });

    if (!project) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }

    const { title, content, pdfUrl } = req.body;

    // Validate title if provided
    if (title !== undefined) {
      if (typeof title !== 'string') {
        res.status(400).json({ error: 'Title must be a string' });
        return;
      }
      if (title.length > 500) {
        res.status(400).json({ error: 'Title must be less than 500 characters' });
        return;
      }
    }

    // Validate content if provided
    if (content !== undefined) {
      if (typeof content !== 'string') {
        res.status(400).json({ error: 'Content must be a string' });
        return;
      }
    }

    // Validate pdfUrl if provided
    if (pdfUrl !== undefined) {
      if (pdfUrl !== null) {
        if (typeof pdfUrl !== 'string') {
          res.status(400).json({ error: 'pdfUrl must be a string or null' });
          return;
        }
        
        // If it's a data URL, validate format
        if (pdfUrl.startsWith('data:')) {
          if (!pdfUrl.startsWith('data:application/pdf;base64,')) {
            res.status(400).json({ error: 'PDF data URL must be base64 encoded' });
            return;
          }
        } else {
          // If it's a regular URL, validate format
          try {
            const url = new URL(pdfUrl);
            if (!['http:', 'https:'].includes(url.protocol)) {
              res.status(400).json({ error: 'PDF URL must use HTTP or HTTPS protocol' });
              return;
            }
          } catch {
            res.status(400).json({ error: 'Invalid PDF URL format' });
            return;
          }
        }
      }
    }

    const data: Record<string, unknown> = {};
    if (title !== undefined) data.title = title.trim();
    if (content !== undefined) data.content = content;
    if (pdfUrl !== undefined) data.pdfUrl = pdfUrl;

    const document = await prisma.document.update({
      where: { id },
      data,
    });

    res.json(document);
  } catch (error: any) {
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Document not found' });
      return;
    }
    console.error('Error updating document:', error);
    res.status(500).json({ error: 'Failed to update document' });
  }
};

/**
 * Delete a document
 * DELETE /api/documents/:id
 */
export const deleteDocument = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const id = req.params.id as string;

    // Verify ownership via project
    const existing = await prisma.document.findUnique({
      where: { id },
    });

    if (!existing) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }

    const project = await prisma.project.findFirst({
      where: {
        id: existing.projectId,
        OR: [
          { ownerId: userId },
          { members: { some: { userId, role: 'EDITOR' } } }
        ]
      },
    });

    if (!project) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }

    await prisma.document.delete({ where: { id } });
    res.json({ message: 'Document deleted successfully' });
  } catch (error: any) {
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Document not found' });
      return;
    }
    console.error('Error deleting document:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
};
