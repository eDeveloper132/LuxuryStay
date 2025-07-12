import OpenAI from 'openai';
import { RoomModel } from '../models/Room.js';
import { BookingModel } from '../models/Booking.js';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
// 1. New reservation (smart room suggestion via OpenAI)
export const createBooking = async (req, res) => {
    const { room, checkIn, checkOut } = req.body;
    const rawUser = req.cookies.user;
    const currentUser = rawUser ? JSON.parse(rawUser) : null;
    if (!currentUser?.id) {
        console.error('⚠️ reportIssue: no id on currentUser cookie:', currentUser);
        return res.status(401).json({ message: 'Not authenticated—invalid user cookie' });
    }
    // Smart suggestion (optional)
    const prompt = `Suggest if room ${room} is good for stay from ${checkIn} to ${checkOut}`;
    const aiResp = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }]
    });
    // Price calculate karo
    const selectedRoom = await RoomModel.findById(room);
    if (!selectedRoom)
        return res.status(404).json({ message: 'Room exist nahin karti' });
    const days = (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24);
    const price = days * selectedRoom.price;
    const booking = await BookingModel.create({
        guest: currentUser.id,
        room, checkIn, checkOut, price
    });
    res.status(201).json({ booking, aiSuggestion: aiResp.choices[0].message?.content });
};
// 2. List user ki bookings
export const getMyBookings = async (req, res) => {
    const rawUser = req.cookies.user;
    const currentUser = rawUser ? JSON.parse(rawUser) : null;
    if (!currentUser?.id) {
        console.error('⚠️ reportIssue: no id on currentUser cookie:', currentUser);
        return res.status(401).json({ message: 'Not authenticated—invalid user cookie' });
    }
    const bookings = await BookingModel.find({ guest: currentUser.id }).populate('room');
    res.json(bookings);
};
export const todaysBookings = async (req, res) => {
    const bookings = await BookingModel.countDocuments({
        checkIn: { $lte: new Date() },
        checkOut: { $gte: new Date() }
    });
    console.log("Todays Bookings:", bookings);
    res.json(bookings);
};
// 3. Check‑in (status update)
export const checkIn = async (req, res) => {
    const { id } = req.params;
    const booking = await BookingModel.findByIdAndUpdate(id, { status: 'checked-in' }, { new: true });
    if (!booking)
        return res.status(404).json({ message: 'Booking nahin mili' });
    res.json(booking);
};
// 4. Check‑out (status update)
export const checkOut = async (req, res) => {
    const { id } = req.params;
    const booking = await BookingModel.findByIdAndUpdate(id, { status: 'checked-out' }, { new: true });
    if (!booking)
        return res.status(404).json({ message: 'Booking nahin mili' });
    res.json(booking);
};
// 5. Cancel booking
export const cancelBooking = async (req, res) => {
    const { id } = req.params;
    const booking = await BookingModel.findByIdAndUpdate(id, { status: 'cancelled' }, { new: true });
    if (!booking)
        return res.status(404).json({ message: 'Booking nahin mili' });
    res.json(booking);
};
// 6. Admin: sab bookings dekhna
export const getAllBookings = async (_req, res) => {
    const bookings = await BookingModel.find().populate('guest room');
    res.json(bookings);
};
