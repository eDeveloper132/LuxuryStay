import { Schema, model } from 'mongoose';
import IUser from './IUser.js';

const userSchema = new Schema<IUser>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin','manager','receptionist','housekeeping','guest'], default: 'guest' },
  isVerified: { type: Boolean, default: false },
  forgotPassword: { type: Boolean, default: false },
  forgotPasswordToken: { type: String, default: null },
  forgotPasswordExpiry: { type: Date, default: null },
  verificationToken: { type: String, default: null },
  verificationTokenExpiry: { type: Date, default: null },
}, { timestamps: true });

export const UserModel = model<IUser>('User', userSchema);
