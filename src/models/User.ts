import { Schema, model } from 'mongoose';
import IUser from './IUser.js';

const userSchema = new Schema<IUser>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin','manager','receptionist','housekeeping','guest'], default: 'guest' },
}, { timestamps: true });

export const UserModel = model<IUser>('User', userSchema);
