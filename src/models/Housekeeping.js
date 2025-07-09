import { Schema, model } from 'mongoose';
const housekeepingSchema = new Schema({
    room: { type: Schema.Types.ObjectId, ref: 'Room', required: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    task: { type: String, required: true },
    status: { type: String, enum: ['pending', 'in-progress', 'completed'], default: 'pending' },
    scheduledAt: { type: Date, required: true },
    completedAt: { type: Date },
}, { timestamps: true });
export const HousekeepingModel = model('Housekeeping', housekeepingSchema);
