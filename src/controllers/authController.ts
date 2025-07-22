import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { UserModel } from '../models/User.js';
import { generateToken } from '../utils/jwt.js';
import { v4 as uuidv4 } from "uuid";
import sendVerificationEmail from '../../emailservice.js';

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  maxAge: 24 * 60 * 60 * 1000, // 1 day
};

export const register = async (req: Request, res: Response) => {
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

    console.log('🆕 User registered',user);
    await sendVerificationEmail(email, hashedToken);
    console.log("A verification link has been sent to the user's email.");
    return res
      .status(201)
      .json({ message: 'Registration successful, Verification email sent' });

  } catch (err) {
    console.error('❌ Registration error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const login = async (req: Request, res: Response) => {
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

    const token = generateToken(user);
    console.log('🔐 Login token:', token);
    console.log("🔐 Login user:",user)

    const objectedUser = user.toObject();
    const id = objectedUser._id;
    const namee = objectedUser.name;
    const emaile = objectedUser.email;
    const role = objectedUser.role;

  res.cookie(
      'user',
      JSON.stringify({ id, namee, emaile, role }),  // <-- note the _id
      {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 1000 * 60 * 60 * 24 * 7,
        path: '/',
      }
    )

    return res.status(200).json({ token, user });

  } catch (err) {
    console.error('❌ Login error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
export const verify_email = async (req: Request, res: Response) => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).send(`
      <html>
        <body>
          <h1>Verification token is required.</h1>
        </body>
      </html>
    `);
  }

  try {
    // Find the user with the matching verification token and check if it's still valid
    const user = await UserModel.findOne({
      verificationToken: token,
      verificationTokenExpiry: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).send(`
        <html>
          <body>
            <h1>Invalid or expired token.</h1>
          </body>
        </html>
      `);
    }

    // Mark the user as verified
    user.isVerified = true;
    user.verificationToken = "";
    // Clear the token expiry
    await user.save();

    // Send the success message with a redirect after 3 seconds
    res.send(`
      <html>
        <head>
          <meta http-equiv="refresh" content="3;url=https://luxury-stay-lyart.vercel.app" />
        </head>
        <body>
          <h1>Email verified successfully!</h1>
          <p>You will be redirected shortly...</p>
        </body>
      </html>
    `);
  } catch (error: any) {
    console.error("Error verifying email:", error);
    res.status(500).send(`
      <html>
        <body>
          <h1>Server error. Please try again later.</h1>
        </body>
      </html>
    `);
  }
};
export const resend_verification = async (req: Request, res: Response) => {
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
  
    } catch (error: any) {
      console.error("Error resending verification email:", error.message);
      res.status(500).send("Internal Server Error");
    }  
}