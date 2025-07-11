import { UserModel } from '../models/User.js';
// Get own profile
export const getMyProfile = async (req, res) => {
    const rawUser = req.cookies.user;
    const currentUser = rawUser ? JSON.parse(rawUser) : null;
    if (!currentUser?.id) {
        console.error('⚠️ reportIssue: no id on currentUser cookie:', currentUser);
        return res.status(401).json({ message: 'Not authenticated—invalid user cookie' });
    }
    const user = await UserModel.findById(currentUser.id).select('-password');
    res.json(user);
};
// Update own profile (name, preferences, etc.)
export const updateMyProfile = async (req, res) => {
    const updates = req.body;
    const rawUser = req.cookies.user;
    const currentUser = rawUser ? JSON.parse(rawUser) : null;
    if (!currentUser?.id) {
        console.error('⚠️ reportIssue: no id on currentUser cookie:', currentUser);
        return res.status(401).json({ message: 'Not authenticated—invalid user cookie' });
    }
    const user = await UserModel.findByIdAndUpdate(currentUser.id, updates, { new: true }).select('-password');
    res.json(user);
};
