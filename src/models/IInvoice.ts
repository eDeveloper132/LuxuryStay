import { Types } from 'mongoose';

export default interface IInvoice {
  _id?: Types.ObjectId;
  booking: Types.ObjectId;         // BookingModel _id
  guest: Types.ObjectId;           // UserModel _id
  amount: number;                  // total amount
  services: {                      // additional services breakdown
    name: string;
    price: number;
  }[];
  issuedAt?: Date;
  paid: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
