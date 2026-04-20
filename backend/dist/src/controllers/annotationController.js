"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createStreamToken = exports.streamAnnotationEvents = exports.deleteComment = exports.updateComment = exports.createComment = exports.deleteAnnotation = exports.updateAnnotation = exports.createAnnotation = exports.getAnnotationsByDoc = void 0;
const db_1 = __importDefault(require("../config/db"));
const annotationSse_1 = require("../realtime/annotationSse");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
async function isProjectOwnerForDoc(docId, userId) {
    const doc = await db_1.default.document.findUnique({
        where: { id: docId },
        select: { project: { select: { ownerId: true } } },
    });
    return !!doc && doc.project.ownerId === userId;
}
async function userCanAccessDoc(docId, userId) {
    const doc = await db_1.default.document.findUnique({
        where: { id: docId },
        select: { projectId: true },
    });
    if (!doc)
        return false;
    const project = await db_1.default.project.findFirst({
        where: {
            id: doc.projectId,
            OR: [{ ownerId: userId }, { members: { some: { userId } } }],
        },
        select: { id: true },
    });
    return !!project;
}
async function ensureUserCanAccessDocOr404(docId, userId, res) {
    const ok = await userCanAccessDoc(docId, userId);
    if (!ok) {
        res.status(404).json({ error: 'Document not found' });
        return false;
    }
    return true;
}
const getAnnotationsByDoc = async (req, res) => {
    try {
        const docId = req.params.docId;
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        if (!(await ensureUserCanAccessDocOr404(docId, userId, res)))
            return;
        const annotations = await db_1.default.annotation.findMany({
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
    }
    catch (error) {
        console.error('Error fetching annotations:', error);
        res.status(500).json({ error: 'Failed to fetch annotations' });
    }
};
exports.getAnnotationsByDoc = getAnnotationsByDoc;
const createAnnotation = async (req, res) => {
    try {
        const { docId, labelId, content, startOffset, endOffset } = req.body;
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        if (!(await ensureUserCanAccessDocOr404(docId, userId, res)))
            return;
        // Ensure label belongs to the same project as the document (prevents cross-project tampering)
        const [doc, label] = await Promise.all([
            db_1.default.document.findUnique({ where: { id: docId }, select: { projectId: true } }),
            db_1.default.label.findUnique({ where: { id: labelId }, select: { projectId: true } }),
        ]);
        if (!doc || !label || doc.projectId !== label.projectId) {
            return res.status(400).json({ error: 'Invalid label for document' });
        }
        const newAnnotation = await db_1.default.annotation.create({
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
    }
    catch (error) {
        console.error('Error creating annotation:', error);
        res.status(500).json({ error: 'Failed to create annotation' });
    }
};
exports.createAnnotation = createAnnotation;
const updateAnnotation = async (req, res) => {
    try {
        const id = req.params.id;
        const { content, labelId } = req.body;
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        const existing = await db_1.default.annotation.findUnique({
            where: { id },
            select: { userId: true, docId: true },
        });
        if (!existing) {
            return res.status(404).json({ error: 'Annotation not found' });
        }
        // Must have access to the doc/project even if you are the author
        if (!(await ensureUserCanAccessDocOr404(existing.docId, userId, res)))
            return;
        const canEdit = existing.userId === userId || (await isProjectOwnerForDoc(existing.docId, userId));
        if (!canEdit) {
            return res.status(403).json({ error: 'You do not have permission to edit this annotation' });
        }
        const data = {};
        if (content !== undefined)
            data.content = content;
        if (labelId !== undefined) {
            // Ensure updated label belongs to same project as doc
            const [doc, label] = await Promise.all([
                db_1.default.document.findUnique({ where: { id: existing.docId }, select: { projectId: true } }),
                db_1.default.label.findUnique({ where: { id: labelId }, select: { projectId: true } }),
            ]);
            if (!doc || !label || doc.projectId !== label.projectId) {
                return res.status(400).json({ error: 'Invalid label for document' });
            }
            data.labelId = labelId;
        }
        const updatedAnnotation = await db_1.default.annotation.update({
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
    }
    catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Annotation not found' });
        }
        console.error('Error updating annotation:', error);
        res.status(500).json({ error: 'Failed to update annotation' });
    }
};
exports.updateAnnotation = updateAnnotation;
const deleteAnnotation = async (req, res) => {
    try {
        const id = req.params.id;
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        const annotation = await db_1.default.annotation.findUnique({
            where: { id },
            select: { id: true, userId: true, docId: true },
        });
        if (!annotation) {
            return res.status(404).json({ error: 'Annotation not found' });
        }
        // Must have access to the doc/project even if you are the author
        if (!(await ensureUserCanAccessDocOr404(annotation.docId, userId, res)))
            return;
        const canDelete = annotation.userId === userId || (await isProjectOwnerForDoc(annotation.docId, userId));
        if (!canDelete) {
            return res.status(403).json({ error: 'You do not have permission to delete this annotation' });
        }
        await db_1.default.annotation.delete({ where: { id } });
        res.json({ message: 'Annotation deleted successfully' });
    }
    catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Annotation not found' });
        }
        console.error('Error deleting annotation:', error);
        res.status(500).json({ error: 'Failed to delete annotation' });
    }
};
exports.deleteAnnotation = deleteAnnotation;
const createComment = async (req, res) => {
    try {
        const annotationId = req.params.id;
        const { content } = req.body;
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        if (!content || !content.trim()) {
            return res.status(400).json({ error: 'Content is required' });
        }
        const annotation = await db_1.default.annotation.findUnique({
            where: { id: annotationId },
            select: { id: true, docId: true },
        });
        if (!annotation) {
            return res.status(404).json({ error: 'Annotation not found' });
        }
        if (!(await ensureUserCanAccessDocOr404(annotation.docId, userId, res)))
            return;
        const comment = await db_1.default.annotationComment.create({
            data: {
                annotationId,
                userId,
                content: content.trim(),
            },
            include: {
                user: { select: { username: true } }
            }
        });
        (0, annotationSse_1.broadcastAnnotationEvent)(annotation.docId, 'comment_created', { annotationId, comment });
        res.status(201).json(comment);
    }
    catch (error) {
        console.error('Error creating comment:', error);
        res.status(500).json({ error: 'Failed to create comment' });
    }
};
exports.createComment = createComment;
const updateComment = async (req, res) => {
    try {
        const commentId = req.params.commentId;
        const { content } = req.body;
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        if (!content || !content.trim()) {
            return res.status(400).json({ error: 'Content is required' });
        }
        const existing = await db_1.default.annotationComment.findUnique({
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
        if (!(await ensureUserCanAccessDocOr404(existing.annotation.docId, userId, res)))
            return;
        const canEdit = existing.userId === userId || (await isProjectOwnerForDoc(existing.annotation.docId, userId));
        if (!canEdit) {
            return res.status(403).json({ error: 'You do not have permission to edit this reply' });
        }
        const updated = await db_1.default.annotationComment.update({
            where: { id: commentId },
            data: { content: content.trim() },
            include: { user: { select: { username: true } } },
        });
        (0, annotationSse_1.broadcastAnnotationEvent)(existing.annotation.docId, 'comment_updated', {
            annotationId: existing.annotation.id,
            comment: updated,
        });
        res.json(updated);
    }
    catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Comment not found' });
        }
        console.error('Error updating comment:', error);
        res.status(500).json({ error: 'Failed to update comment' });
    }
};
exports.updateComment = updateComment;
const deleteComment = async (req, res) => {
    try {
        const commentId = req.params.commentId;
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        const existing = await db_1.default.annotationComment.findUnique({
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
        if (!(await ensureUserCanAccessDocOr404(existing.annotation.docId, userId, res)))
            return;
        const canDelete = existing.userId === userId || (await isProjectOwnerForDoc(existing.annotation.docId, userId));
        if (!canDelete) {
            return res.status(403).json({ error: 'You do not have permission to delete this reply' });
        }
        await db_1.default.annotationComment.delete({ where: { id: commentId } });
        (0, annotationSse_1.broadcastAnnotationEvent)(existing.annotation.docId, 'comment_deleted', {
            annotationId: existing.annotationId,
            commentId,
        });
        res.json({ message: 'Comment deleted successfully' });
    }
    catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Comment not found' });
        }
        console.error('Error deleting comment:', error);
        res.status(500).json({ error: 'Failed to delete comment' });
    }
};
exports.deleteComment = deleteComment;
const streamAnnotationEvents = async (req, res) => {
    const docId = req.params.docId;
    // req.user is set by sseAuthMiddleware; we only need it to gate access.
    if (!req.user?.userId) {
        return res.status(401).json({ error: 'User not authenticated' });
    }
    if (!(await ensureUserCanAccessDocOr404(docId, req.user.userId, res)))
        return;
    (0, annotationSse_1.addAnnotationSseClient)(docId, req, res);
};
exports.streamAnnotationEvents = streamAnnotationEvents;
const createStreamToken = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        const { docId } = req.body;
        if (!docId) {
            return res.status(400).json({ error: 'docId is required' });
        }
        if (!(await ensureUserCanAccessDocOr404(docId, userId, res)))
            return;
        const secret = process.env.JWT_ACCESS_SECRET;
        if (!secret) {
            return res.status(500).json({ error: 'JWT secret not configured' });
        }
        // Short-lived, doc-scoped token specifically for SSE subscription
        const streamToken = jsonwebtoken_1.default.sign({ userId, docId, typ: 'annotation_stream' }, secret, { expiresIn: '60s', algorithm: 'HS256' });
        res.json({ streamToken, expiresInSeconds: 60 });
    }
    catch (error) {
        console.error('Error creating stream token:', error);
        res.status(500).json({ error: 'Failed to create stream token' });
    }
};
exports.createStreamToken = createStreamToken;
