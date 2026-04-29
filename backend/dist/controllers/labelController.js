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
        const newLabel = await db_1.default.label.create({
            data: {
                projectId,
                name,
                color,
            },
        });
        res.status(201).json(newLabel);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to create label' });
    }
};
exports.createLabel = createLabel;
const updateLabel = async (req, res) => {
    try {
        const id = req.params.id;
        const { name, color } = req.body;
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
