"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteDocument = exports.updateDocument = exports.createDocument = exports.getDocumentById = exports.getDocumentsByProject = void 0;
const db_1 = __importDefault(require("../config/db"));
/**
 * List documents for a project (verifies project ownership)
 * GET /api/documents/project/:projectId
 */
const getDocumentsByProject = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }
        const projectId = req.params.projectId;
        // Verify the user is owner or member
        const project = await db_1.default.project.findFirst({
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
        const documents = await db_1.default.document.findMany({
            where: { projectId },
            orderBy: { updatedAt: 'desc' },
        });
        res.json(documents);
    }
    catch (error) {
        console.error('Error fetching documents:', error);
        res.status(500).json({ error: 'Failed to fetch documents' });
    }
};
exports.getDocumentsByProject = getDocumentsByProject;
/**
 * Get a single document by ID (verifies project ownership)
 * GET /api/documents/:id
 */
const getDocumentById = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }
        const id = req.params.id;
        const document = await db_1.default.document.findUnique({
            where: { id },
        });
        if (!document) {
            res.status(404).json({ error: 'Document not found' });
            return;
        }
        // Verify access through the project
        const project = await db_1.default.project.findFirst({
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
    }
    catch (error) {
        console.error('Error fetching document:', error);
        res.status(500).json({ error: 'Failed to fetch document' });
    }
};
exports.getDocumentById = getDocumentById;
/**
 * Create a new document
 * POST /api/documents
 * Body: { projectId, title, kind?, content?, pdfUrl? }
 */
const createDocument = async (req, res) => {
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
        // Verify project access (Owner or Editor)
        const project = await db_1.default.project.findFirst({
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
        const document = await db_1.default.document.create({
            data: {
                title: title.trim(),
                projectId,
                kind: kind || 'text',
                content: content || '',
                pdfUrl: pdfUrl || null,
            },
        });
        // Touch the project's updatedAt
        await db_1.default.project.update({
            where: { id: projectId },
            data: { updatedAt: new Date() },
        });
        res.status(201).json(document);
    }
    catch (error) {
        console.error('Error creating document:', error);
        res.status(500).json({ error: 'Failed to create document' });
    }
};
exports.createDocument = createDocument;
/**
 * Update a document (title, content)
 * PUT /api/documents/:id
 * Body: { title?, content?, pdfUrl? }
 */
const updateDocument = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }
        const id = req.params.id;
        // Verify ownership via project
        const existing = await db_1.default.document.findUnique({
            where: { id },
        });
        if (!existing) {
            res.status(404).json({ error: 'Document not found' });
            return;
        }
        const project = await db_1.default.project.findFirst({
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
        const data = {};
        if (title !== undefined)
            data.title = title.trim();
        if (content !== undefined)
            data.content = content;
        if (pdfUrl !== undefined)
            data.pdfUrl = pdfUrl;
        const document = await db_1.default.document.update({
            where: { id },
            data,
        });
        res.json(document);
    }
    catch (error) {
        if (error.code === 'P2025') {
            res.status(404).json({ error: 'Document not found' });
            return;
        }
        console.error('Error updating document:', error);
        res.status(500).json({ error: 'Failed to update document' });
    }
};
exports.updateDocument = updateDocument;
/**
 * Delete a document
 * DELETE /api/documents/:id
 */
const deleteDocument = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }
        const id = req.params.id;
        // Verify ownership via project
        const existing = await db_1.default.document.findUnique({
            where: { id },
        });
        if (!existing) {
            res.status(404).json({ error: 'Document not found' });
            return;
        }
        const project = await db_1.default.project.findFirst({
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
        await db_1.default.document.delete({ where: { id } });
        res.json({ message: 'Document deleted successfully' });
    }
    catch (error) {
        if (error.code === 'P2025') {
            res.status(404).json({ error: 'Document not found' });
            return;
        }
        console.error('Error deleting document:', error);
        res.status(500).json({ error: 'Failed to delete document' });
    }
};
exports.deleteDocument = deleteDocument;
