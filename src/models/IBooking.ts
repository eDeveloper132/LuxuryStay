import { Types } from 'mongoose';

export default interface IBooking {
  _id?: Types.ObjectId;          // changed from string
  guest: Types.ObjectId;         // ObjectId type
  room: Types.ObjectId;
  invoice: Types.ObjectId;
  checkIn: Date;
  checkOut: Date;
  status: 'reserved' | 'checked-in' | 'checked-out' | 'cancelled';
  price: number;
  createdAt?: Date;
  updatedAt?: Date;
}
