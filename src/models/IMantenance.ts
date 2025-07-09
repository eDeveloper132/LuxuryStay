import { Types } from 'mongoose';

export default interface IMaintenance {
  _id?: Types.ObjectId;
  room: Types.ObjectId;
  reportedBy: Types.ObjectId;         // guest or staff _id
  description: string;
  status: 'reported' | 'in-progress' | 'resolved';
  reportedAt: Date;
  resolvedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}
