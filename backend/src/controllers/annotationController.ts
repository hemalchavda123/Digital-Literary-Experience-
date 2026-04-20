import { Request, Response } from 'express';
import prisma from '../config/db';
import { addAnnotationSseClient, broadcastAnnotationEvent } from '../realtime/annotationSse';
import jwt from 'jsonwebtoken';

async function isProjectOwnerForDoc(docId: string, userId: string): Promise<boolean> {
  const doc = await prisma.document.findUnique({
    where: { id: docId },
    select: { project: { select: { ownerId: true } } },
  });
  return !!doc && doc.project.ownerId === userId;
}

async function userCanAccessDoc(docId: string, userId: string): Promise<boolean> {
  const doc = await prisma.document.findUnique({
    where: { id: docId },
    select: { projectId: true },
  });
  if (!doc) return false;

  const project = await prisma.project.findFirst({
    where: {
      id: doc.projectId,
      OR: [{ ownerId: userId }, { members: { some: { userId } } }],
    },
    select: { id: true },
  });
  return !!project;
}

async function ensureUserCanAccessDocOr404(docId: string, userId: string, res: Response): Promise<boolean> {
  const ok = await userCanAccessDoc(docId, userId);
  if (!ok) {
    res.status(404).json({ error: 'Document not found' });
    return false;
  }
  return true;
}

async function getUserPermissions(docId: string, userId: string) {
  const doc = await prisma.document.findUnique({
    where: { id: docId },
    select: { projectId: true },
  });
  if (!doc) return null;

  const member = await prisma.projectMember.findFirst({
    where: { projectId: doc.projectId, userId },
    select: {
      canViewOthersAnnotations: true,
      canAnnotate: true,
      canViewAdminAnnotations: true,
    },
  });

  return member;
}

export const getAnnotationsByDoc = async (req: Request, res: Response) => {
  try {
    const docId = req.params.docId as string;
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    if (!(await ensureUserCanAccessDocOr404(docId, userId, res))) return;

    const permissions = await getUserPermissions(docId, userId);
    const isOwner = await isProjectOwnerForDoc(docId, userId);

    // Owners see all annotations
    if (isOwner) {
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
      return res.json(annotations);
    }

    // Non-owners: filter based on permissions
    const allAnnotations = await prisma.annotation.findMany({
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

    // Filter annotations based on permissions
    const filteredAnnotations: any[] = [];
    for (const ann of allAnnotations) {
      // Always show user's own annotations
      if (ann.userId === userId) {
        filteredAnnotations.push(ann);
        continue;
      }

      // If canViewOthersAnnotations is false, hide others' annotations
      if (!permissions?.canViewOthersAnnotations) continue;

      // If canViewAdminAnnotations is false and the annotation is from an admin (owner), hide it
      if (!permissions?.canViewAdminAnnotations) {
        // Check if annotation author is project owner
        const isAnnotatorOwner = await isProjectOwnerForDoc(docId, ann.userId);
        if (isAnnotatorOwner) continue;
      }

      filteredAnnotations.push(ann);
    }

    res.json(filteredAnnotations);
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

    if (!(await ensureUserCanAccessDocOr404(docId, userId, res))) return;

    // Check if user can annotate (unless they're the owner)
    const isOwner = await isProjectOwnerForDoc(docId, userId);
    if (!isOwner) {
      const permissions = await getUserPermissions(docId, userId);
      if (!permissions?.canAnnotate) {
        return res.status(403).json({ error: 'You do not have permission to annotate this document' });
      }
    }

    // Ensure label belongs to the same project as the document (prevents cross-project tampering)
    const [doc, label] = await Promise.all([
      prisma.document.findUnique({ where: { id: docId }, select: { projectId: true } }),
      prisma.label.findUnique({ where: { id: labelId }, select: { projectId: true } }),
    ]);
    if (!doc || !label || doc.projectId !== label.projectId) {
      return res.status(400).json({ error: 'Invalid label for document' });
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
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const existing = await prisma.annotation.findUnique({
      where: { id },
      select: { userId: true, docId: true },
    });
    if (!existing) {
      return res.status(404).json({ error: 'Annotation not found' });
    }

    // Must have access to the doc/project even if you are the author
    if (!(await ensureUserCanAccessDocOr404(existing.docId, userId, res))) return;

    const canEdit = existing.userId === userId || (await isProjectOwnerForDoc(existing.docId, userId));
    if (!canEdit) {
      return res.status(403).json({ error: 'You do not have permission to edit this annotation' });
    }

    const data: any = {};
    if (content !== undefined) data.content = content;
    if (labelId !== undefined) {
      // Ensure updated label belongs to same project as doc
      const [doc, label] = await Promise.all([
        prisma.document.findUnique({ where: { id: existing.docId }, select: { projectId: true } }),
        prisma.label.findUnique({ where: { id: labelId }, select: { projectId: true } }),
      ]);
      if (!doc || !label || doc.projectId !== label.projectId) {
        return res.status(400).json({ error: 'Invalid label for document' });
      }
      data.labelId = labelId;
    }

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

    const annotation = await prisma.annotation.findUnique({
      where: { id },
      select: { id: true, userId: true, docId: true },
    });
    if (!annotation) {
      return res.status(404).json({ error: 'Annotation not found' });
    }

    // Must have access to the doc/project even if you are the author
    if (!(await ensureUserCanAccessDocOr404(annotation.docId, userId, res))) return;

    const canDelete = annotation.userId === userId || (await isProjectOwnerForDoc(annotation.docId, userId));
    if (!canDelete) {
      return res.status(403).json({ error: 'You do not have permission to delete this annotation' });
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

    const annotation = await prisma.annotation.findUnique({
      where: { id: annotationId },
      select: { id: true, docId: true },
    });
    if (!annotation) {
      return res.status(404).json({ error: 'Annotation not found' });
    }

    if (!(await ensureUserCanAccessDocOr404(annotation.docId, userId, res))) return;

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

    broadcastAnnotationEvent(annotation.docId, 'comment_created', { annotationId, comment });
    res.status(201).json(comment);
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({ error: 'Failed to create comment' });
  }
};

export const updateComment = async (req: Request, res: Response) => {
  try {
    const commentId = req.params.commentId as string;
    const { content } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const existing = await prisma.annotationComment.findUnique({
      where: { id: commentId },
      select: {
        id: true,
        userId: true,
        annotation: { select: { docId: true, id: true } },
      },
    });
    if (!existing) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (!(await ensureUserCanAccessDocOr404(existing.annotation.docId, userId, res))) return;

    const canEdit = existing.userId === userId || (await isProjectOwnerForDoc(existing.annotation.docId, userId));
    if (!canEdit) {
      return res.status(403).json({ error: 'You do not have permission to edit this reply' });
    }

    const updated = await prisma.annotationComment.update({
      where: { id: commentId },
      data: { content: content.trim() },
      include: { user: { select: { username: true } } },
    });

    broadcastAnnotationEvent(existing.annotation.docId, 'comment_updated', {
      annotationId: existing.annotation.id,
      comment: updated,
    });

    res.json(updated);
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Comment not found' });
    }
    console.error('Error updating comment:', error);
    res.status(500).json({ error: 'Failed to update comment' });
  }
};

export const deleteComment = async (req: Request, res: Response) => {
  try {
    const commentId = req.params.commentId as string;
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const existing = await prisma.annotationComment.findUnique({
      where: { id: commentId },
      select: {
        id: true,
        userId: true,
        annotationId: true,
        annotation: { select: { docId: true } },
      },
    });
    if (!existing) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (!(await ensureUserCanAccessDocOr404(existing.annotation.docId, userId, res))) return;

    const canDelete = existing.userId === userId || (await isProjectOwnerForDoc(existing.annotation.docId, userId));
    if (!canDelete) {
      return res.status(403).json({ error: 'You do not have permission to delete this reply' });
    }

    await prisma.annotationComment.delete({ where: { id: commentId } });
    broadcastAnnotationEvent(existing.annotation.docId, 'comment_deleted', {
      annotationId: existing.annotationId,
      commentId,
    });
    res.json({ message: 'Comment deleted successfully' });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Comment not found' });
    }
    console.error('Error deleting comment:', error);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
};

export const streamAnnotationEvents = async (req: Request, res: Response) => {
  const docId = req.params.docId as string;
  // req.user is set by sseAuthMiddleware; we only need it to gate access.
  if (!req.user?.userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }
  if (!(await ensureUserCanAccessDocOr404(docId, req.user.userId, res))) return;
  addAnnotationSseClient(docId, req, res);
};

export const createStreamToken = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    const { docId } = req.body as { docId?: string };
    if (!docId) {
      return res.status(400).json({ error: 'docId is required' });
    }
    if (!(await ensureUserCanAccessDocOr404(docId, userId, res))) return;

    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) {
      return res.status(500).json({ error: 'JWT secret not configured' });
    }

    // Short-lived, doc-scoped token specifically for SSE subscription
    const streamToken = jwt.sign(
      { userId, docId, typ: 'annotation_stream' },
      secret,
      { expiresIn: '60s', algorithm: 'HS256' }
    );

    res.json({ streamToken, expiresInSeconds: 60 });
  } catch (error) {
    console.error('Error creating stream token:', error);
    res.status(500).json({ error: 'Failed to create stream token' });
  }
};
