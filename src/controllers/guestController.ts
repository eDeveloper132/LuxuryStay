import { Response } from 'express';
import { UserModel } from '../models/User.js';
import { AuthRequest } from '../middleware/auth.js';

// Get own profile
export const getMyProfile = async (req: AuthRequest, res: Response) => {
  const user = await UserModel.findById(req.user!.id).select('-password');
  res.json(user);
};

// Update own profile (name, preferences, etc.)
export const updateMyProfile = async (req: AuthRequest, res: Response) => {
  const updates = req.body;
  const user = await UserModel.findByIdAndUpdate(req.user!.id, updates, { new: true }).select('-password');
  res.json(user);
};
