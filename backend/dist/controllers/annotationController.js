"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteAnnotation = exports.updateAnnotation = exports.createAnnotation = exports.getAnnotationsByDoc = void 0;
const db_1 = __importDefault(require("../config/db"));
const getAnnotationsByDoc = async (req, res) => {
    try {
        const docId = req.params.docId;
        const annotations = await db_1.default.annotation.findMany({
            where: { docId },
            orderBy: { createdAt: 'asc' },
        });
        res.json(annotations);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch annotations' });
    }
};
exports.getAnnotationsByDoc = getAnnotationsByDoc;
const createAnnotation = async (req, res) => {
    try {
        const { docId, labelId, content, startOffset, endOffset } = req.body;
        const newAnnotation = await db_1.default.annotation.create({
            data: {
                docId,
                labelId,
                content: content || '',
                startOffset,
                endOffset,
            },
        });
        res.status(201).json(newAnnotation);
    }
    catch (error) {
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
        });
        res.json(updatedAnnotation);
    }
    catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Annotation not found' });
        }
        res.status(500).json({ error: 'Failed to update annotation' });
    }
};
exports.updateAnnotation = updateAnnotation;
const deleteAnnotation = async (req, res) => {
    try {
        const id = req.params.id;
        await db_1.default.annotation.delete({ where: { id } });
        res.json({ message: 'Annotation deleted successfully' });
    }
    catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Annotation not found' });
        }
        res.status(500).json({ error: 'Failed to delete annotation' });
    }
};
exports.deleteAnnotation = deleteAnnotation;
