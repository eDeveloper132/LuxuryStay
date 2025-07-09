import { Schema, model } from 'mongoose';
import IMaintenance from './IMantenance.js';

const maintenanceSchema = new Schema<IMaintenance>({
  room:         { type: Schema.Types.ObjectId, ref: 'Room', required: true },
  reportedBy:   { type: Schema.Types.ObjectId, ref: 'User', required: true },
  description:  { type: String, required: true },
  status:       { type: String, enum: ['reported','in-progress','resolved'], default: 'reported' },
  reportedAt:   { type: Date, default: Date.now },
  resolvedAt:   { type: Date },
}, { timestamps: true });

export const MaintenanceModel = model<IMaintenance>('Maintenance', maintenanceSchema);
