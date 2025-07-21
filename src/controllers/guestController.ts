import { Request,Response } from 'express';
import { UserModel } from '../models/User.js';

// Get own profile
export const getMyProfile = async (req: Request, res: Response) => {
  try {
    const rawUser = req.cookies.user as string | undefined;
    const currentUser = rawUser ? JSON.parse(rawUser) : null;

    if (!currentUser?.id) {
      console.error('⚠️ getMyProfile: no id on currentUser cookie:', currentUser);
      return res.status(401).json({ message: 'Not authenticated—invalid user cookie' });
    }

    const user = await UserModel.findById(currentUser.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json(user);
  } catch (err) {
    console.error('❌ getMyProfile error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};


// Update own profile (name, preferences, etc.)
export const updateMyProfile = async (req: Request, res: Response) => {
  try {
    const updates = req.body;
    const rawUser = req.cookies.user as string | undefined;
    const currentUser = rawUser ? JSON.parse(rawUser) : null;

    if (!currentUser?.id) {
      console.error('⚠️ updateMyProfile: no id on currentUser cookie:', currentUser);
      return res.status(401).json({ message: 'Not authenticated—invalid user cookie' });
    }

    const user = await UserModel.findByIdAndUpdate(currentUser.id, updates, {
      new: true,
      runValidators: true,
    }).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json(user);
  } catch (err) {
    console.error('❌ updateMyProfile error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
