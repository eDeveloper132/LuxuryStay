import bcrypt from 'bcrypt';
import { UserModel } from '../models/User.js';
import { generateToken } from '../utils/jwt.js';
import { v4 as uuidv4 } from "uuid";
import { notifyUser, sendVerificationEmail } from '../../emailservice.js';
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
        const token = uuidv4();
        console.log("Generated verification token:", token);
        const hashedToken = await bcrypt.hash(token, 10);
        console.log("Hashed verification token for storage.");
        const user = await UserModel.create({
            name,
            email,
            password: hashedPassword,
            role: 'guest',
            verificationToken: hashedToken,
            verificationTokenExpiry: new Date(Date.now() + 3600000),
            isVerified: false
        });
        console.log('🆕 User registered', user);
        await sendVerificationEmail(email, hashedToken);
        console.log("A verification link has been sent to the user's email.");
        return res
            .status(201)
            .json({ message: 'Registration successful, Verification email sent' });
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
        if (user.isVerified === false) {
            return res.status(403).json({ message: 'Please verify your account, check you mailbox' });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        if (user.role === 'admin') {
            return res.status(403).json({ message: 'Admin login not allowed please create an account here' });
        }
        if (user.forgotPassword === true) {
            user.forgotPassword = false;
            await user.save();
        }
        const token = generateToken(user);
        console.log('🔐 Login token:', token);
        console.log("🔐 Login user:", user);
        const objectedUser = user.toObject();
        const id = objectedUser._id;
        const namee = objectedUser.name;
        const emaile = objectedUser.email;
        const role = objectedUser.role;
        await notifyUser(email, "You have logged in successfully. Date&Time: " + new Date().toUTCString());
        res.cookie('user', JSON.stringify({ id, namee, emaile, role }), // <-- note the _id
        {
            httpOnly: false,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 1000 * 60 * 60 * 24 * 7,
            path: '/',
        });
        return res.status(200).json({ token, user });
    }
    catch (err) {
        console.error('❌ Login error:', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
export const resend_verification = async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).send("Error: Email is required");
    }
    try {
        const user = await UserModel.findOne({ email: email });
        if (!user) {
            return res.status(404).send("Error: User not found");
        }
        if (user.isVerified) {
            return res
                .status(208)
                .json({ success: true, message: "Your email is already verified." });
        }
        const token = uuidv4(); // Use UUID or any unique token generator
        const hashed = await bcrypt.hash(token, 10);
        const verificationToken = hashed;
        (user.verificationToken = hashed),
            (user.verificationTokenExpiry = new Date(Date.now() + 3600000));
        user.save();
        await sendVerificationEmail(email, verificationToken);
        res.status(200).send("Verification email sent");
    }
    catch (error) {
        console.error("Error resending verification email:", error.message);
        res.status(500).send("Internal Server Error");
    }
};
