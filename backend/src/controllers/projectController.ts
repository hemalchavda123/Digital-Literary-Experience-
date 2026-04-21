import { Request, Response } from 'express';
import prisma from '../config/db';

/**
 * List all projects for the authenticated user
 * GET /api/projects
 */
export const getProjects = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const projects = await prisma.project.findMany({
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
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
};

/**
 * Get a single project by ID (must be owned by the user)
 * GET /api/projects/:id
 */
export const getProjectById = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const id = req.params.id as string;
    const project = await prisma.project.findFirst({
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
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
};

/**
 * Create a new project
 * POST /api/projects
 * Body: { name }
 */
export const createProject = async (req: Request, res: Response): Promise<void> => {
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

    const project = await prisma.project.create({
      data: {
        name: name.trim(),
        ownerId: userId,
      },
    });

    res.status(201).json(project);
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
};

/**
 * Update a project (rename)
 * PUT /api/projects/:id
 * Body: { name }
 */
export const updateProject = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const id = req.params.id as string;

    // Verify ownership
    const existing = await prisma.project.findFirst({
      where: { id, ownerId: userId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const { name } = req.body;
    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name.trim();

    const project = await prisma.project.update({
      where: { id },
      data,
    });

    res.json(project);
  } catch (error: any) {
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    console.error('Error updating project:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
};

/**
 * Delete a project (cascades to documents)
 * DELETE /api/projects/:id
 */
export const deleteProject = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const id = req.params.id as string;

    // Verify ownership
    const existing = await prisma.project.findFirst({
      where: { id, ownerId: userId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    await prisma.project.delete({ where: { id } });
    res.json({ message: 'Project deleted successfully' });
  } catch (error: any) {
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    console.error('Error deleting project:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
};

/**
 * Update member permissions (only project owner can do this)
 * PUT /api/projects/:projectId/members/:userId/permissions
 * Body: { canViewOthersAnnotations, canAnnotate, canViewAdminAnnotations }
 */
export const updateMemberPermissions = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const projectId = req.params.projectId as string;
    const memberUserId = req.params.userId as string;

    // Verify user is project owner
    const project = await prisma.project.findFirst({
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
    const member = await prisma.projectMember.findFirst({
      where: { projectId, userId: memberUserId },
    });

    if (!member) {
      res.status(404).json({ error: 'Member not found in project' });
      return;
    }

    const { canViewOthersAnnotations, canAnnotate, canViewAdminAnnotations } = req.body;

    const updatedMember = await prisma.projectMember.update({
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
  } catch (error) {
    console.error('Error updating member permissions:', error);
    res.status(500).json({ error: 'Failed to update permissions' });
  }
};

/**
 * Update default project permissions (only project owner can do this)
 * PUT /api/projects/:projectId/default-permissions
 * Body: { defaultCanViewAnnotations, defaultCanAnnotate, defaultCanViewAdminAnnotations }
 */
export const updateDefaultPermissions = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const projectId = req.params.projectId as string;

    // Verify user is project owner
    const project = await prisma.project.findFirst({
      where: { id: projectId, ownerId: userId },
    });

    if (!project) {
      res.status(403).json({ error: 'Only project owner can update default permissions' });
      return;
    }

    const { defaultCanViewAnnotations, defaultCanAnnotate, defaultCanViewAdminAnnotations } = req.body;

    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: {
        defaultCanViewAnnotations: defaultCanViewAnnotations !== undefined ? defaultCanViewAnnotations : (project as any).defaultCanViewAnnotations,
        defaultCanAnnotate: defaultCanAnnotate !== undefined ? defaultCanAnnotate : (project as any).defaultCanAnnotate,
        defaultCanViewAdminAnnotations: defaultCanViewAdminAnnotations !== undefined ? defaultCanViewAdminAnnotations : (project as any).defaultCanViewAdminAnnotations,
      } as any,
    });

    res.json(updatedProject);
  } catch (error) {
    console.error('Error updating default permissions:', error);
    res.status(500).json({ error: 'Failed to update default permissions' });
  }
};
