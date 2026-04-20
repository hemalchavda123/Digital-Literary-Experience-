"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateMemberRole = exports.removeProjectMember = exports.getProjectMembers = exports.joinProjectViaLink = exports.createInviteLink = void 0;
const db_1 = __importDefault(require("../config/db"));
/**
 * Generate a shareable invite link for a project
 * POST /api/projects/:projectId/invites
 * Body: { role: 'VIEWER' | 'EDITOR' }
 */
const createInviteLink = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }
        const projectId = req.params.projectId;
        const { role } = req.body;
        // Verify ownership
        const project = await db_1.default.project.findFirst({
            where: { id: projectId, ownerId: userId },
        });
        if (!project) {
            res.status(404).json({ error: 'Project not found or unauthorized' });
            return;
        }
        const validRole = role === 'EDITOR' ? 'EDITOR' : 'VIEWER';
        const invite = await db_1.default.projectInvite.create({
            data: {
                projectId,
                role: validRole,
                // Optional: expires in 7 days
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
        });
        res.status(201).json({ token: invite.token, role: invite.role });
    }
    catch (error) {
        console.error('Error creating invite link:', error);
        res.status(500).json({ error: 'Failed to create invite link' });
    }
};
exports.createInviteLink = createInviteLink;
/**
 * Join a project via invite link
 * POST /api/projects/join/:token
 */
const joinProjectViaLink = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }
        const token = req.params.token;
        const invite = await db_1.default.projectInvite.findUnique({
            where: { token },
            include: { project: true },
        });
        if (!invite) {
            res.status(404).json({ error: 'Invalid invite link' });
            return;
        }
        if (invite.expiresAt && invite.expiresAt < new Date()) {
            res.status(400).json({ error: 'Invite link has expired' });
            return;
        }
        if (invite.project.ownerId === userId) {
            res.status(400).json({ error: 'You are already the owner of this project' });
            return;
        }
        // Check if already a member
        const existingMember = await db_1.default.projectMember.findUnique({
            where: {
                projectId_userId: {
                    projectId: invite.projectId,
                    userId,
                },
            },
        });
        if (existingMember) {
            // Maybe update role if the invite grants higher access
            res.status(200).json({ message: 'Already a member of this project', projectId: invite.projectId });
            return;
        }
        await db_1.default.projectMember.create({
            data: {
                projectId: invite.projectId,
                userId,
                role: invite.role,
            },
        });
        res.status(200).json({ message: 'Joined project successfully', projectId: invite.projectId });
    }
    catch (error) {
        console.error('Error joining project:', error);
        res.status(500).json({ error: 'Failed to join project' });
    }
};
exports.joinProjectViaLink = joinProjectViaLink;
/**
 * Get all members of a project
 * GET /api/projects/:projectId/members
 */
const getProjectMembers = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }
        const projectId = req.params.projectId;
        console.log("getProjectMembers called with projectId:", projectId, "userId:", userId);
        // Check if owner or member
        const project = await db_1.default.project.findFirst({
            where: { id: projectId },
        });
        if (!project) {
            console.log("Project not found in getProjectMembers");
            res.status(404).json({ error: 'Project not found' });
            return;
        }
        const isOwner = project.ownerId === userId;
        const isMember = await db_1.default.projectMember.findFirst({
            where: { projectId, userId },
        });
        if (!isOwner && !isMember) {
            res.status(403).json({ error: 'Unauthorized' });
            return;
        }
        const members = await db_1.default.projectMember.findMany({
            where: { projectId },
            include: {
                user: {
                    select: { id: true, username: true, email: true },
                },
            },
            orderBy: { createdAt: 'asc' },
        });
        res.json(members);
    }
    catch (error) {
        console.error('Error fetching members:', error);
        res.status(500).json({ error: 'Failed to fetch members' });
    }
};
exports.getProjectMembers = getProjectMembers;
/**
 * Remove a member from a project
 * DELETE /api/projects/:projectId/members/:memberId
 */
const removeProjectMember = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }
        const projectId = req.params.projectId;
        const memberId = req.params.memberId;
        // Only owner can remove
        const project = await db_1.default.project.findFirst({
            where: { id: projectId, ownerId: userId },
        });
        if (!project) {
            res.status(404).json({ error: 'Project not found or unauthorized' });
            return;
        }
        await db_1.default.projectMember.delete({
            where: {
                projectId_userId: {
                    projectId,
                    userId: memberId,
                },
            },
        });
        res.json({ message: 'Member removed successfully' });
    }
    catch (error) {
        console.error('Error removing member:', error);
        res.status(500).json({ error: 'Failed to remove member' });
    }
};
exports.removeProjectMember = removeProjectMember;
/**
 * Update member role
 * PUT /api/projects/:projectId/members/:memberId
 * Body: { role: 'VIEWER' | 'EDITOR' }
 */
const updateMemberRole = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }
        const projectId = req.params.projectId;
        const memberId = req.params.memberId;
        const { role } = req.body;
        // Only owner can update roles
        const project = await db_1.default.project.findFirst({
            where: { id: projectId, ownerId: userId },
        });
        if (!project) {
            res.status(404).json({ error: 'Project not found or unauthorized' });
            return;
        }
        const validRole = role === 'EDITOR' ? 'EDITOR' : 'VIEWER';
        const updated = await db_1.default.projectMember.update({
            where: {
                projectId_userId: {
                    projectId,
                    userId: memberId,
                },
            },
            data: { role: validRole },
        });
        res.json(updated);
    }
    catch (error) {
        console.error('Error updating member role:', error);
        res.status(500).json({ error: 'Failed to update member role' });
    }
};
exports.updateMemberRole = updateMemberRole;
