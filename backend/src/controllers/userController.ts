import { Request, Response } from 'express';
import userService from '../services/userService';

/**
 * Update the profile image of the authenticated user
 * PATCH /api/users/profile-image
 * Body: { profileImage: string }
 */
export const updateProfileImage = async (req: Request, res: Response): Promise<void> => {

  try {
    const userId = req.user?.userId;
    console.log('[updateProfileImage] User ID from request:', userId);

    if (!userId) {
      console.warn('[updateProfileImage] No userId in request user object');
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { profileImage } = req.body;
    console.log('[updateProfileImage] profileImage length:', profileImage?.length || 0);

    if (!profileImage) {
      console.warn('[updateProfileImage] No profileImage in request body');
      res.status(400).json({ error: 'profileImage is required' });
      return;
    }

    console.log('[updateProfileImage] Attempting database update...');
    const updatedUser = await userService.updateProfileImage(userId!, profileImage);
    console.log('[updateProfileImage] Database update successful');

    res.json({
      message: 'Profile image updated successfully',
      user: updatedUser,
    });
  } catch (error: any) {
    console.error('[updateProfileImage] CRITICAL ERROR:', error);
    res.status(500).json({ 
      error: 'Failed to update profile image',
      details: error.message || String(error)
    });
  }
};

/**
 * Get current user profile
 * GET /api/users/me
 */
export const getCurrentUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const user = await userService.findUserById(userId);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching current user:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
};
