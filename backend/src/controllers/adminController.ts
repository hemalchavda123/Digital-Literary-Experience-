import { Request, Response } from 'express';
import prisma from '../config/db';

/**
 * Get dashboard stats for Admin / Superadmin
 * GET /api/admin/stats
 */
export const getAdminStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const isSuperAdmin = req.user?.systemRole === 'SUPERADMIN';
    const userId = req.user?.userId;

    const [totalUsers, totalSuperAdmins, totalAdmins] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { systemRole: 'SUPERADMIN' } }),
      prisma.user.count({ where: { systemRole: 'ADMIN' } }),
    ]);

    // Superadmin sees platform-wide project count; Admin sees their own managed projects
    const totalProjects = isSuperAdmin
      ? await prisma.project.count()
      : await prisma.project.count({ where: { ownerId: userId } });

    const totalSubmissions = await prisma.quizSubmission.count();

    // Check system-wide allowed email pattern setting
    const globalPatternSetting = await prisma.systemSetting.findUnique({
      where: { key: 'PLATFORM_ALLOWED_EMAIL_PATTERNS' },
    });

    res.json({
      isSuperAdmin,
      totalUsers,
      totalSuperAdmins,
      totalAdmins,
      totalProjects,
      totalSubmissions,
      platformEmailPattern: globalPatternSetting?.value || null,
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ error: 'Failed to fetch admin statistics' });
  }
};

/**
 * List projects accessible to the admin
 * GET /api/admin/projects
 * Superadmin: returns all projects across the platform
 * Admin: returns projects owned by this admin
 */
export const getAdminProjects = async (req: Request, res: Response): Promise<void> => {
  try {
    const isSuperAdmin = req.user?.systemRole === 'SUPERADMIN';
    const userId = req.user?.userId;

    const whereClause = isSuperAdmin ? {} : { ownerId: userId };

    const projects = await prisma.project.findMany({
      where: whereClause,
      include: {
        owner: {
          select: { id: true, username: true, email: true, systemRole: true },
        },
        _count: {
          select: {
            members: true,
            documents: true,
            quizzes: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(projects);
  } catch (error) {
    console.error('Error fetching admin projects:', error);
    res.status(500).json({ error: 'Failed to fetch admin projects' });
  }
};

/**
 * Update project access rules (allowed email patterns)
 * PATCH /api/admin/projects/:projectId/access-rules
 * Body: { allowedEmailPatterns: string | null }
 */
export const updateProjectAccessRules = async (req: Request, res: Response): Promise<void> => {
  try {
    const projectId = req.params.projectId as string;
    const { allowedEmailPatterns } = req.body;
    const isSuperAdmin = req.user?.systemRole === 'SUPERADMIN';
    const userId = req.user?.userId;

    // Check ownership unless Superadmin
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    if (!isSuperAdmin && project.ownerId !== userId) {
      res.status(403).json({ error: 'Unauthorized: You can only configure access rules for your own projects' });
      return;
    }

    const updated = await prisma.project.update({
      where: { id: projectId },
      data: {
        allowedEmailPatterns: allowedEmailPatterns ? allowedEmailPatterns.trim() : null,
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('Error updating project access rules:', error);
    res.status(500).json({ error: 'Failed to update project access rules' });
  }
};

/**
 * Superadmin only: List all registered users
 * GET /api/admin/users
 */
export const getAdminUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        username: true,
        systemRole: true,
        isVerified: true,
        createdAt: true,
        _count: {
          select: {
            projects: true,
            projectMemberships: true,
            quizSubmissions: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(users);
  } catch (error) {
    console.error('Error fetching admin users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

/**
 * Superadmin only: Assign/change user systemRole
 * PATCH /api/admin/users/:userId/role
 * Body: { systemRole: 'USER' | 'ADMIN' | 'SUPERADMIN' }
 */
export const updateUserSystemRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const targetUserId = req.params.userId as string;
    const { systemRole } = req.body;
    const currentUserId = req.user?.userId;

    if (!['USER', 'ADMIN', 'SUPERADMIN'].includes(systemRole)) {
      res.status(400).json({ error: 'Invalid systemRole value' });
      return;
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Protect designated superadmins from accidental demotion
    const DESIGNATED = ['202301131@dau.ac.in', '202301451@dau.ac.in'];
    if (DESIGNATED.includes(targetUser.email.toLowerCase()) && systemRole !== 'SUPERADMIN') {
      res.status(400).json({ error: 'Cannot demote permanent designated superadmin accounts' });
      return;
    }

    // Prevent superadmin self-demotion
    if (targetUserId === currentUserId && systemRole !== 'SUPERADMIN') {
      res.status(400).json({ error: 'You cannot demote your own superadmin account' });
      return;
    }

    const updated = await prisma.user.update({
      where: { id: targetUserId },
      data: { systemRole },
      select: {
        id: true,
        email: true,
        username: true,
        systemRole: true,
      },
    });

    res.json({ message: `Role updated to ${systemRole} for ${updated.email}`, user: updated });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ error: 'Failed to update user system role' });
  }
};

/**
 * Superadmin only: Get/Set Platform-wide settings
 * GET /api/admin/settings
 * POST /api/admin/settings
 */
export const getPlatformSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const settings = await prisma.systemSetting.findMany();
    const map: Record<string, string> = {};
    settings.forEach((s) => (map[s.key] = s.value));
    res.json(map);
  } catch (error) {
    console.error('Error fetching platform settings:', error);
    res.status(500).json({ error: 'Failed to fetch platform settings' });
  }
};

export const updatePlatformSetting = async (req: Request, res: Response): Promise<void> => {
  try {
    const { key, value } = req.body;
    if (!key) {
      res.status(400).json({ error: 'Setting key is required' });
      return;
    }

    const setting = await prisma.systemSetting.upsert({
      where: { key },
      update: { value: value || '' },
      create: { key, value: value || '' },
    });

    res.json(setting);
  } catch (error) {
    console.error('Error updating platform setting:', error);
    res.status(500).json({ error: 'Failed to update platform setting' });
  }
};
