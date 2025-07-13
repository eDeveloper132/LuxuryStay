import { RoomModel } from '../models/Room.js';
import { BookingModel } from '../models/Booking.js';
// Helper to get current user ID from body or cookie
function getCurrentUserId(req) {
    const { id } = req.body;
    if (id)
        return id;
    const raw = req.cookies.user;
    if (!raw)
        return null;
    try {
        const user = JSON.parse(raw);
        return user.id;
    }
    catch {
        return null;
    }
}
export const createBooking = async (req, res) => {
    const { room, checkIn: ci, checkOut: co } = req.body;
    // 1) Validate inputs
    if (!room || !ci || !co) {
        return res.status(400).json({ message: 'room, checkIn and checkOut are required' });
    }
    const checkIn = new Date(ci);
    const checkOut = new Date(co);
    if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
        return res.status(400).json({ message: 'Invalid date format' });
    }
    if (checkIn >= checkOut) {
        return res.status(400).json({ message: 'Check-out must be after check-in' });
    }
    // 2) Ensure no overlap for *this room*
    const overlapping = await BookingModel.find({
        room,
        status: 'reserved',
        $or: [
            { checkIn: { $lte: checkIn }, checkOut: { $gte: checkIn } },
            { checkIn: { $lte: checkOut }, checkOut: { $gte: checkOut } },
            // Corrected: existing check-in inside your window
            { checkIn: { $gte: checkIn, $lte: checkOut } },
            // Corrected: existing check-out inside your window
            { checkOut: { $gte: checkIn, $lte: checkOut } }
        ]
    });
    if (overlapping.length) {
        return res.status(400).json({ message: 'Booking overlap' });
    }
    // 3) Authenticate user
    const userId = getCurrentUserId(req);
    if (!userId) {
        return res.status(401).json({ message: 'Not authenticated' });
    }
    // 4) Fetch room & compute price
    const roomDoc = await RoomModel.findById(room);
    if (!roomDoc) {
        return res.status(404).json({ message: 'Room not found' });
    }
    const msPerDay = 1000 * 60 * 60 * 24;
    const days = (checkOut.getTime() - checkIn.getTime()) / msPerDay;
    const price = days * roomDoc.price;
    // 5) Create booking (default status: reserved)
    const booking = await BookingModel.create({
        guest: userId,
        room,
        checkIn,
        checkOut,
        price,
        status: 'reserved',
    });
    return res.status(201).json({ booking });
};
export const getMyBookings = async (req, res) => {
    const userId = getCurrentUserId(req);
    if (!userId) {
        return res.status(401).json({ message: 'Not authenticated' });
    }
    const bookings = await BookingModel.find({ guest: userId }).populate('room');
    return res.json(bookings);
};
export const todaysBookings = async (_req, res) => {
    const now = new Date();
    const count = await BookingModel.countDocuments({
        checkIn: { $lte: now },
        checkOut: { $gte: now }
    });
    return res.json({ count });
};
export const checkIn = async (req, res) => {
    const { id, room } = req.params;
    if (!id || !room) {
        return res.status(400).json({ message: 'Booking ID and room ID are required' });
    }
    const booking = await BookingModel.findByIdAndUpdate(id, { status: 'checked-in' }, { new: true });
    if (!booking) {
        return res.status(404).json({ message: 'Booking not found' });
    }
    await RoomModel.findByIdAndUpdate(room, { status: 'occupied' });
    return res.json(booking);
};
export const checkOut = async (req, res) => {
    const { id, room } = req.params;
    if (!id || !room) {
        return res.status(400).json({ message: 'Booking ID and room ID are required' });
    }
    const booking = await BookingModel.findByIdAndUpdate(id, { status: 'checked-out' }, { new: true });
    if (!booking) {
        return res.status(404).json({ message: 'Booking not found' });
    }
    await RoomModel.findByIdAndUpdate(room, { status: 'available' });
    return res.json(booking);
};
export const cancelBooking = async (req, res) => {
    const { id } = req.params;
    if (!id) {
        return res.status(400).json({ message: 'Booking ID is required' });
    }
    const booking = await BookingModel.findByIdAndUpdate(id, { status: 'cancelled' }, { new: true });
    if (!booking) {
        return res.status(404).json({ message: 'Booking not found' });
    }
    return res.json(booking);
};
export const getAllBookings = async (_req, res) => {
    const bookings = await BookingModel.find()
        .populate('guest')
        .populate('room');
    return res.json(bookings);
};
