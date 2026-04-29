"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateDefaultPermissions = exports.updateMemberPermissions = exports.deleteProject = exports.updateProject = exports.createProject = exports.getProjectById = exports.getProjects = void 0;
const db_1 = __importDefault(require("../config/db"));
/**
 * List all projects for the authenticated user
 * GET /api/projects
 */
const getProjects = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }
        const projects = await db_1.default.project.findMany({
            where: {
                OR: [
                    { ownerId: userId },
                    { members: { some: { userId } } }
                ]
            },
            orderBy: { updatedAt: 'desc' },
            include: {
                owner: { select: { username: true } },
            }
        });
        res.json(projects);
    }
    catch (error) {
        console.error('Error fetching projects:', error);
        res.status(500).json({ error: 'Failed to fetch projects' });
    }
};
exports.getProjects = getProjects;
/**
 * Get a single project by ID (must be owned by the user)
 * GET /api/projects/:id
 */
const getProjectById = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }
        const id = req.params.id;
        const project = await db_1.default.project.findFirst({
            where: {
                id,
                OR: [
                    { ownerId: userId },
                    { members: { some: { userId } } }
                ]
            },
            include: {
                owner: { select: { username: true } },
                members: { where: { userId } } // Just to include user's role if needed
            }
        });
        if (!project) {
            res.status(404).json({ error: 'Project not found' });
            return;
        }
        res.json(project);
    }
    catch (error) {
        console.error('Error fetching project:', error);
        res.status(500).json({ error: 'Failed to fetch project' });
    }
};
exports.getProjectById = getProjectById;
/**
 * Create a new project
 * POST /api/projects
 * Body: { name }
 */
const createProject = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }
        const { name } = req.body;
        if (!name || !name.trim()) {
            res.status(400).json({ error: 'Project name is required' });
            return;
        }
        if (typeof name !== 'string') {
            res.status(400).json({ error: 'Project name must be a string' });
            return;
        }
        if (name.trim().length < 1 || name.trim().length > 200) {
            res.status(400).json({ error: 'Project name must be between 1 and 200 characters' });
            return;
        }
        const project = await db_1.default.project.create({
            data: {
                name: name.trim(),
                ownerId: userId,
            },
        });
        res.status(201).json(project);
    }
    catch (error) {
        console.error('Error creating project:', error);
        res.status(500).json({ error: 'Failed to create project' });
    }
};
exports.createProject = createProject;
/**
 * Update a project (rename)
 * PUT /api/projects/:id
 * Body: { name }
 */
const updateProject = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }
        const id = req.params.id;
        // Verify ownership
        const existing = await db_1.default.project.findFirst({
            where: { id, ownerId: userId },
        });
        if (!existing) {
            res.status(404).json({ error: 'Project not found' });
            return;
        }
        const { name } = req.body;
        const data = {};
        if (name !== undefined)
            data.name = name.trim();
        const project = await db_1.default.project.update({
            where: { id },
            data,
        });
        res.json(project);
    }
    catch (error) {
        if (error.code === 'P2025') {
            res.status(404).json({ error: 'Project not found' });
            return;
        }
        console.error('Error updating project:', error);
        res.status(500).json({ error: 'Failed to update project' });
    }
};
exports.updateProject = updateProject;
/**
 * Delete a project (cascades to documents)
 * DELETE /api/projects/:id
 */
const deleteProject = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }
        const id = req.params.id;
        // Verify ownership
        const existing = await db_1.default.project.findFirst({
            where: { id, ownerId: userId },
        });
        if (!existing) {
            res.status(404).json({ error: 'Project not found' });
            return;
        }
        await db_1.default.project.delete({ where: { id } });
        res.json({ message: 'Project deleted successfully' });
    }
    catch (error) {
        if (error.code === 'P2025') {
            res.status(404).json({ error: 'Project not found' });
            return;
        }
        console.error('Error deleting project:', error);
        res.status(500).json({ error: 'Failed to delete project' });
    }
};
exports.deleteProject = deleteProject;
/**
 * Update member permissions (only project owner can do this)
 * PUT /api/projects/:projectId/members/:userId/permissions
 * Body: { canViewOthersAnnotations, canAnnotate, canViewAdminAnnotations }
 */
const updateMemberPermissions = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }
        const projectId = req.params.projectId;
        const memberUserId = req.params.userId;
        // Verify user is project owner
        const project = await db_1.default.project.findFirst({
            where: { id: projectId, ownerId: userId },
        });
        if (!project) {
            res.status(403).json({ error: 'Only project owner can update permissions' });
            return;
        }
        // Don't allow changing owner's permissions
        if (memberUserId === userId) {
            res.status(400).json({ error: 'Cannot change owner permissions' });
            return;
        }
        // Verify the member exists in the project
        const member = await db_1.default.projectMember.findFirst({
            where: { projectId, userId: memberUserId },
        });
        if (!member) {
            res.status(404).json({ error: 'Member not found in project' });
            return;
        }
        const { canViewOthersAnnotations, canAnnotate, canViewAdminAnnotations } = req.body;
        const updatedMember = await db_1.default.projectMember.update({
            where: { id: member.id },
            data: {
                canViewOthersAnnotations: canViewOthersAnnotations !== undefined ? canViewOthersAnnotations : member.canViewOthersAnnotations,
                canAnnotate: canAnnotate !== undefined ? canAnnotate : member.canAnnotate,
                canViewAdminAnnotations: canViewAdminAnnotations !== undefined ? canViewAdminAnnotations : member.canViewAdminAnnotations,
            },
            include: {
                user: { select: { username: true } },
            },
        });
        res.json(updatedMember);
    }
    catch (error) {
        console.error('Error updating member permissions:', error);
        res.status(500).json({ error: 'Failed to update permissions' });
    }
};
exports.updateMemberPermissions = updateMemberPermissions;
/**
 * Update default project permissions (only project owner can do this)
 * PUT /api/projects/:projectId/default-permissions
 * Body: { defaultCanViewAnnotations, defaultCanAnnotate, defaultCanViewAdminAnnotations }
 */
const updateDefaultPermissions = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }
        const projectId = req.params.projectId;
        // Verify user is project owner
        const project = await db_1.default.project.findFirst({
            where: { id: projectId, ownerId: userId },
        });
        if (!project) {
            res.status(403).json({ error: 'Only project owner can update default permissions' });
            return;
        }
        const { defaultCanViewAnnotations, defaultCanAnnotate, defaultCanViewAdminAnnotations } = req.body;
        const updatedProject = await db_1.default.project.update({
            where: { id: projectId },
            data: {
                defaultCanViewAnnotations: defaultCanViewAnnotations !== undefined ? defaultCanViewAnnotations : project.defaultCanViewAnnotations,
                defaultCanAnnotate: defaultCanAnnotate !== undefined ? defaultCanAnnotate : project.defaultCanAnnotate,
                defaultCanViewAdminAnnotations: defaultCanViewAdminAnnotations !== undefined ? defaultCanViewAdminAnnotations : project.defaultCanViewAdminAnnotations,
            },
        });
        res.json(updatedProject);
    }
    catch (error) {
        console.error('Error updating default permissions:', error);
        res.status(500).json({ error: 'Failed to update default permissions' });
    }
};
exports.updateDefaultPermissions = updateDefaultPermissions;
