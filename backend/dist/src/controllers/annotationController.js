"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createComment = exports.deleteAnnotation = exports.updateAnnotation = exports.createAnnotation = exports.getAnnotationsByDoc = void 0;
const db_1 = __importDefault(require("../config/db"));
const getAnnotationsByDoc = async (req, res) => {
    try {
        const docId = req.params.docId;
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
        const data = {};
        if (content !== undefined)
            data.content = content;
        if (labelId !== undefined)
            data.labelId = labelId;
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
        const annotation = await db_1.default.annotation.findUnique({ where: { id } });
        if (!annotation) {
            return res.status(404).json({ error: 'Annotation not found' });
        }
        // Usually only the owner of the annotation or project OWNER/EDITOR can delete.
        // For simplicity, we allow the annotation author to delete it.
        if (annotation.userId !== userId) {
            // Add more complex checks if needed (e.g. project owner)
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
        res.status(201).json(comment);
    }
    catch (error) {
        console.error('Error creating comment:', error);
        res.status(500).json({ error: 'Failed to create comment' });
    }
};
exports.createComment = createComment;
