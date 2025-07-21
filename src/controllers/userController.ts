import { Request, Response } from 'express';
import { UserModel } from '../models/User.js';
import bcrypt from 'bcrypt';


// 1. List all users
export const allUsers = async (_req: Request, res: Response) => {
  try {
    const users = await UserModel.find().select('-password');
    console.log('Fetched users:', users);
    return res.json(users);
  } catch (err) {
    console.error('❌ allUsers error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
// 2. Get user by ID
export const getUserById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ message: 'User ID is required' });
    }
    const user = await UserModel.findById(id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    return res.json(user);
  } catch (err) {
    console.error('❌ getUserById error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
// 3. Get user by role
export const getUserByRole = async (req: Request, res: Response) => {
  try {
    const { role } = req.params;
    if (!role) {
      return res.status(400).json({ message: 'Role is required' });
    }
    const user = await UserModel.findOne({ role }).select('-password');
    if (!user) {
      return res.status(404).json({ message: `No user with role "${role}" found` });
    }
    return res.json(user);
  } catch (err) {
    console.error('❌ getUserByRole error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
// 4. Get user by email
export const getUserByEmail = async (req: Request, res: Response) => {
  try {
    const { email } = req.params;
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }
    const user = await UserModel.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: `No user with email "${email}" found` });
    }
    return res.json(user);
  } catch (err) {
    console.error('❌ getUserByEmail error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
// 5. Update user by ID
export const updateUserById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    if (!id) {
      return res.status(400).json({ message: 'User ID is required' });
    }
    const user = await UserModel.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
      context: 'query',
    }).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    return res.json(user);
  } catch (err: any) {
    console.error('❌ updateUserById error:', err);
    if (err.name === 'ValidationError') {
      return res.status(422).json({ message: err.message, errors: err.errors });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// 6. Delete user by ID
export const deleteUserById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ message: 'User ID is required' });
    }
    const user = await UserModel.findByIdAndDelete(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    return res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('❌ deleteUserById error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
// 7. Create new user
export const createUser = async (req: Request, res: Response) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'name, email, password, and role are required' });
    }
    const existing = await UserModel.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: 'Email already in use' });
    }
    const hashed = await bcrypt.hash(password, 10);
    const user = await UserModel.create({ name, email, password: hashed, role });
    return res.status(201).json(user);
  } catch (err: any) {
    console.error('❌ createUser error:', err);
    if (err.name === 'ValidationError') {
      return res.status(422).json({ message: err.message, errors: err.errors });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
};