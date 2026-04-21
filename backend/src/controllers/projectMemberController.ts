import { Request, Response } from 'express';
import prisma from '../config/db';

/**
 * Generate a shareable invite link for a project
 * POST /api/projects/:projectId/invites
 * Body: { role: 'VIEWER' | 'EDITOR' }
 */
export const createInviteLink = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const projectId = req.params.projectId as string;
    const { role } = req.body;

    // Verify ownership
    const project = await prisma.project.findFirst({
      where: { id: projectId, ownerId: userId },
    });

    if (!project) {
      res.status(404).json({ error: 'Project not found or unauthorized' });
      return;
    }

    const validRole = role === 'EDITOR' ? 'EDITOR' : 'VIEWER';

    const invite = await prisma.projectInvite.create({
      data: {
        projectId,
        role: validRole,
        // Optional: expires in 7 days
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    res.status(201).json({ token: invite.token, role: invite.role });
  } catch (error) {
    console.error('Error creating invite link:', error);
    res.status(500).json({ error: 'Failed to create invite link' });
  }
};

/**
 * Join a project via invite link
 * POST /api/projects/join/:token
 */
export const joinProjectViaLink = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const token = req.params.token as string;

    const invite = await prisma.projectInvite.findUnique({
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
    const existingMember = await prisma.projectMember.findUnique({
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

    await prisma.projectMember.create({
      data: {
        projectId: invite.projectId,
        userId,
        role: invite.role,
      },
    });

    res.status(200).json({ message: 'Joined project successfully', projectId: invite.projectId });
  } catch (error) {
    console.error('Error joining project:', error);
    res.status(500).json({ error: 'Failed to join project' });
  }
};

/**
 * Get all members of a project
 * GET /api/projects/:projectId/members
 */
export const getProjectMembers = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const projectId = req.params.projectId as string;
    console.log("getProjectMembers called with projectId:", projectId, "userId:", userId);

    // Check if owner or member
    const project = await prisma.project.findFirst({
      where: { id: projectId },
    });

    if (!project) {
      console.log("Project not found in getProjectMembers");
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const isOwner = project.ownerId === userId;
    const isMember = await prisma.projectMember.findFirst({
      where: { projectId, userId },
    });

    if (!isOwner && !isMember) {
      res.status(403).json({ error: 'Unauthorized' });
      return;
    }

    const members = await prisma.projectMember.findMany({
      where: { projectId },
      include: {
        user: {
          select: { id: true, username: true, email: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json(members);
  } catch (error) {
    console.error('Error fetching members:', error);
    res.status(500).json({ error: 'Failed to fetch members' });
  }
};

/**
 * Remove a member from a project
 * DELETE /api/projects/:projectId/members/:memberId
 */
export const removeProjectMember = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const projectId = req.params.projectId as string;
    const memberId = req.params.memberId as string;

    // Only owner can remove
    const project = await prisma.project.findFirst({
      where: { id: projectId, ownerId: userId },
    });

    if (!project) {
      res.status(404).json({ error: 'Project not found or unauthorized' });
      return;
    }

    await prisma.projectMember.delete({
      where: {
        projectId_userId: {
          projectId,
          userId: memberId,
        },
      },
    });

    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error('Error removing member:', error);
    res.status(500).json({ error: 'Failed to remove member' });
  }
};

/**
 * Update member role
 * PUT /api/projects/:projectId/members/:memberId
 * Body: { role: 'VIEWER' | 'EDITOR' }
 */
export const updateMemberRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const projectId = req.params.projectId as string;
    const memberId = req.params.memberId as string;
    const { role } = req.body;

    // Only owner can update roles
    const project = await prisma.project.findFirst({
      where: { id: projectId, ownerId: userId },
    });

    if (!project) {
      res.status(404).json({ error: 'Project not found or unauthorized' });
      return;
    }

    const validRole = role === 'EDITOR' ? 'EDITOR' : 'VIEWER';

    const updated = await prisma.projectMember.update({
      where: {
        projectId_userId: {
          projectId,
          userId: memberId,
        },
      },
      data: { role: validRole },
    });

    res.json(updated);
  } catch (error) {
    console.error('Error updating member role:', error);
    res.status(500).json({ error: 'Failed to update member role' });
  }
};

/**
 * Invite user by user ID
 * POST /api/projects/:projectId/invite-user
 * Body: { userId, role }
 */
export const inviteUserById = async (req: Request, res: Response): Promise<void> => {
  try {
    const currentUserId = req.user?.userId;
    if (!currentUserId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const projectId = req.params.projectId as string;
    const { userId, role } = req.body;

    if (!userId || !role) {
      res.status(400).json({ error: 'userId and role are required' });
      return;
    }

    // Verify ownership
    const project = await prisma.project.findFirst({
      where: { id: projectId, ownerId: currentUserId },
    });

    if (!project) {
      res.status(404).json({ error: 'Project not found or unauthorized' });
      return;
    }

    if (userId === currentUserId) {
      res.status(400).json({ error: 'Cannot invite yourself' });
      return;
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Check if already a member
    const existingMember = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
    });

    if (existingMember) {
      res.status(400).json({ error: 'User is already a member of this project' });
      return;
    }

    const validRole = role === 'EDITOR' ? 'EDITOR' : 'VIEWER';

    const member = await prisma.projectMember.create({
      data: {
        projectId,
        userId,
        role: validRole,
      },
      include: {
        user: {
          select: { id: true, username: true, email: true },
        },
      },
    });

    res.status(201).json(member);
  } catch (error) {
    console.error('Error inviting user by ID:', error);
    res.status(500).json({ error: 'Failed to invite user' });
  }
};

/**
 * Invite user by email
 * POST /api/projects/:projectId/invite-email
 * Body: { email, role }
 */
export const inviteUserByEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const currentUserId = req.user?.userId;
    if (!currentUserId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const projectId = req.params.projectId as string;
    const { email, role } = req.body;

    if (!email || !role) {
      res.status(400).json({ error: 'email and role are required' });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({ error: 'Invalid email format' });
      return;
    }

    // Verify ownership
    const project = await prisma.project.findFirst({
      where: { id: projectId, ownerId: currentUserId },
    });

    if (!project) {
      res.status(404).json({ error: 'Project not found or unauthorized' });
      return;
    }

    // Check if user exists with this email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      res.status(404).json({ error: 'No user found with this email' });
      return;
    }

    if (user.id === currentUserId) {
      res.status(400).json({ error: 'Cannot invite yourself' });
      return;
    }

    // Check if already a member
    const existingMember = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId: user.id,
        },
      },
    });

    if (existingMember) {
      res.status(400).json({ error: 'User is already a member of this project' });
      return;
    }

    const validRole = role === 'EDITOR' ? 'EDITOR' : 'VIEWER';

    const member = await prisma.projectMember.create({
      data: {
        projectId,
        userId: user.id,
        role: validRole,
      },
      include: {
        user: {
          select: { id: true, username: true, email: true },
        },
      },
    });

    res.status(201).json(member);
  } catch (error) {
    console.error('Error inviting user by email:', error);
    res.status(500).json({ error: 'Failed to invite user' });
  }
};
