import { UserModel } from '../models/User.js';
// Get own profile
export const getMyProfile = async (req, res) => {
    const user = await UserModel.findById(req.user.id).select('-password');
    res.json(user);
};
// Update own profile (name, preferences, etc.)
export const updateMyProfile = async (req, res) => {
    const updates = req.body;
    const user = await UserModel.findByIdAndUpdate(req.user.id, updates, { new: true }).select('-password');
    res.json(user);
};
