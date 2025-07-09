import { Types } from 'mongoose';

export default interface IHousekeeping {
  _id?: Types.ObjectId;
  room: Types.ObjectId;                // RoomModel _id
  assignedTo?: Types.ObjectId;         // UserModel (housekeeping) _id
  task: string;                        // e.g. 'cleaning', 'restocking'
  status: 'pending' | 'in-progress' | 'completed';
  scheduledAt: Date;
  completedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}
