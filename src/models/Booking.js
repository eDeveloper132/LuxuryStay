import { Schema, model } from 'mongoose';
const bookingSchema = new Schema({
    guest: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    room: { type: Schema.Types.ObjectId, ref: 'Room', required: true },
    checkIn: { type: Date, required: true },
    checkOut: { type: Date, required: true },
    status: { type: String, enum: ['reserved', 'checked-in', 'checked-out', 'cancelled'], default: 'reserved' },
    price: { type: Number, required: true },
}, { timestamps: true });
// Hook: jab booking confirmed ho jaye “reserved” se “checked-in” hota hai to room status update karo
bookingSchema.post('findOneAndUpdate', async function (doc) {
    if (doc && doc.status === 'checked-in') {
        const RoomModel = await import('./Room.js').then(m => m.RoomModel);
        await RoomModel.findByIdAndUpdate(doc.room, { status: 'occupied' });
    }
    if (doc && doc.status === 'checked-out') {
        const RoomModel = await import('./Room.js').then(m => m.RoomModel);
        await RoomModel.findByIdAndUpdate(doc.room, { status: 'available' });
    }
});
export const BookingModel = model('Booking', bookingSchema);
