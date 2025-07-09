import bcrypt from 'bcrypt';
import { UserModel } from '../models/User.js';
import { generateToken } from '../utils/jwt.js';
export const register = async (req, res) => {
    const { name, email, password } = req.body;
    const hashed = await bcrypt.hash(password, 10);
    const user = await UserModel.create({ name, email, password: hashed });
    res.status(201).json({ token: generateToken(user) });
};
export const login = async (req, res) => {
    const { email, password } = req.body;
    const user = await UserModel.findOne({ email });
    if (user && await bcrypt.compare(password, user.password)) {
        return res.json({ token: generateToken(user) });
    }
    res.status(401).json({ message: 'Invalid credentials' });
};
