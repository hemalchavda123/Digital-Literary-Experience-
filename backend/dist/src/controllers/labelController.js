"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteLabel = exports.updateLabel = exports.createLabel = exports.getLabelsByProject = void 0;
const db_1 = __importDefault(require("../config/db"));
const getLabelsByProject = async (req, res) => {
    try {
        const projectId = req.params.projectId;
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        // Verify ownership or membership
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
            return res.status(403).json({ error: 'Unauthorized to view labels for this project' });
        }
        const labels = await db_1.default.label.findMany({
            where: { projectId },
            orderBy: { createdAt: 'asc' },
        });
        res.json(labels);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch labels' });
    }
};
exports.getLabelsByProject = getLabelsByProject;
const createLabel = async (req, res) => {
    try {
        const { projectId, name, color } = req.body;
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        // Only OWNER can create labels
        const project = await db_1.default.project.findFirst({
            where: { id: projectId, ownerId: userId },
        });
        if (!project) {
            return res.status(403).json({ error: 'Only the project owner can create labels' });
        }
        const newLabel = await db_1.default.label.create({
            data: {
                projectId,
                name,
                color,
                userId,
            },
        });
        res.status(201).json(newLabel);
    }
    catch (error) {
        console.error('Error creating label:', error);
        res.status(500).json({ error: 'Failed to create label', details: String(error) });
    }
};
exports.createLabel = createLabel;
const updateLabel = async (req, res) => {
    try {
        const id = req.params.id;
        const { name, color } = req.body;
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        const existing = await db_1.default.label.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ error: 'Label not found' });
        }
        // Only OWNER can update labels
        const project = await db_1.default.project.findFirst({
            where: { id: existing.projectId, ownerId: userId },
        });
        if (!project) {
            return res.status(403).json({ error: 'Only the project owner can update labels' });
        }
        const data = {};
        if (name !== undefined)
            data.name = name;
        if (color !== undefined)
            data.color = color;
        const updatedLabel = await db_1.default.label.update({
            where: { id },
            data,
        });
        res.json(updatedLabel);
    }
    catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Label not found' });
        }
        res.status(500).json({ error: 'Failed to update label' });
    }
};
exports.updateLabel = updateLabel;
const deleteLabel = async (req, res) => {
    try {
        const id = req.params.id;
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        const existing = await db_1.default.label.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ error: 'Label not found' });
        }
        // Only OWNER can delete labels
        const project = await db_1.default.project.findFirst({
            where: { id: existing.projectId, ownerId: userId },
        });
        if (!project) {
            return res.status(403).json({ error: 'Only the project owner can delete labels' });
        }
        await db_1.default.label.delete({ where: { id } });
        res.json({ message: 'Label deleted successfully' });
    }
    catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Label not found' });
        }
        res.status(500).json({ error: 'Failed to delete label' });
    }
};
exports.deleteLabel = deleteLabel;
