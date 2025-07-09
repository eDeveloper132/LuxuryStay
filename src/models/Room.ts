import { Schema, model } from 'mongoose';
import IRoom from './IRoom.js';

const roomSchema = new Schema<IRoom>({
  number:    { type: String, required: true, unique: true },
  type:      { type: String, enum: ['single','double','suite'], required: true },
  price:     { type: Number, required: true },
  status:    { type: String, enum: ['available','occupied','cleaning','maintenance'], default: 'available' },
  features:  { type: [String], default: [] },
}, { timestamps: true });

export const RoomModel = model<IRoom>('Room', roomSchema);
