import { Schema, model, Types } from 'mongoose';
import IInvoice from './IInvoice.js';

const serviceSchema = new Schema({
  name:  { type: String, required: true },
  price: { type: Number, required: true },
}, { _id: false });

const invoiceSchema = new Schema<IInvoice>({
  booking:  { type: Schema.Types.ObjectId, ref: 'Booking', required: true },
  guest:    { type: Schema.Types.ObjectId, ref: 'User',    required: true },
  amount:   { type: Number,     required: true },
  services: { type: [serviceSchema], default: [] },
  issuedAt: { type: Date,       default: Date.now },
  paid:     { type: Boolean,    default: false },
}, { timestamps: true });

export const InvoiceModel = model<IInvoice>('Invoice', invoiceSchema);
