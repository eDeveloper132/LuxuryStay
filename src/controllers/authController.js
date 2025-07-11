import bcrypt from 'bcrypt';
import { UserModel } from '../models/User.js';
import { generateToken } from '../utils/jwt.js';
const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000, // 1 day
};
export const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        // Check if user already exists
        const existingUser = await UserModel.findOne({ email });
        if (existingUser) {
            return res.status(409).json({ message: 'Email already in use' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await UserModel.create({
            name,
            email,
            password: hashedPassword,
            role: 'guest'
        });
        console.log('🆕 User registered', user);
        return res
            .status(201)
            .json({ message: 'Registration successful' });
    }
    catch (err) {
        console.error('❌ Registration error:', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await UserModel.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        const token = generateToken(user);
        console.log('🔐 Login token:', token);
        console.log("🔐 Login user:", user);
        const objectedUser = user.toObject();
        const id = objectedUser._id;
        const namee = objectedUser.name;
        const emaile = objectedUser.email;
        const role = objectedUser.role;
        res.cookie('user', JSON.stringify({ id, namee, emaile, role }), // <-- note the _id
        {
            httpOnly: false,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 1000 * 60 * 60 * 24 * 7,
            path: '/',
        });
        return res.status(200).json({ token });
    }
    catch (err) {
        console.error('❌ Login error:', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
