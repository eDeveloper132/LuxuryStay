import { Request, Response } from 'express';
import { RoomModel } from '../models/Room.js';
import { BookingModel } from '../models/Booking.js';
import { UserModel } from '../models/User.js';
import { notifyUser } from '../../emailservice.js';

interface ParsedUser { id: string; }

// Helper to get current user ID from body or cookie
function getCurrentUserId(req: Request): string | null {
  // 1) If you ever POST an { id } in the body, honor it:
  const body = req.body as { id?: string } | undefined;
  if (body && typeof body.id === 'string') {
    return body.id;
  }

  // 2) Otherwise fall back to the cookie:
  const raw = req.cookies.user as string | undefined;
  if (!raw) return null;

  try {
    return (JSON.parse(raw) as ParsedUser).id;
  } catch {
    return null;
  }
}


export const createBooking = async (req: Request, res: Response) => {
  try {
    const { room, checkIn: ci, checkOut: co } = req.body as {
      room?: string;
      checkIn?: string;
      checkOut?: string;
    };

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

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const checkInStart = new Date(checkIn.getFullYear(), checkIn.getMonth(), checkIn.getDate());
    if (checkInStart <= todayStart) {
      return res.status(400).json({ message: 'Check-in date must be in the future' });
    }

    const overlapping = await BookingModel.find({
      room,
      status: 'reserved',
      $or: [
        { checkIn: { $lte: checkIn }, checkOut: { $gte: checkIn } },
        { checkIn: { $lte: checkOut }, checkOut: { $gte: checkOut } },
        { checkIn: { $gte: checkIn, $lte: checkOut } },
        { checkOut: { $gte: checkIn, $lte: checkOut } },
      ],
    });
    if (overlapping.length) {
      return res.status(400).json({ message: 'Booking overlap' });
    }

    const userId = getCurrentUserId(req);
    if (!userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const roomDoc = await RoomModel.findById(room);
    if (!roomDoc) {
      return res.status(404).json({ message: 'Room not found' });
    }

    const msPerDay = 1000 * 60 * 60 * 24;
    const days = (checkOut.getTime() - checkIn.getTime()) / msPerDay;
    const price = days * roomDoc.price;

    const booking = await BookingModel.create({
      guest: userId,
      room,
      checkIn,
      checkOut,
      price,
      status: 'reserved',
    });
    const user = await UserModel.findById(userId);
    if (user?.email != null) {
      await notifyUser(user.email, `Your booking has been created!`);
    }
    return res.status(201).json({ booking });
  } catch (err) {
    console.error('❌ createBooking error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const getMyBookings = async (req: Request, res: Response) => {
  try {
    const userId = getCurrentUserId(req);
    if (!userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    const bookings = await BookingModel.find({ guest: userId }).populate('room');
    return res.json(bookings);
  } catch (err) {
    console.error('❌ getMyBookings error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const todaysBookings = async (_req: Request, res: Response) => {
  try {
    const now = new Date();
    const count = await BookingModel.countDocuments({
      checkIn: { $lte: now },
      checkOut: { $gte: now },
    });
    return res.json({ count });
  } catch (err) {
    console.error('❌ todaysBookings error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const checkIn = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const room = req.body.room;
    if (!id || !room) {
      return res.status(400).json({ message: 'Booking ID and room ID are required' });
    }
    const booking = await BookingModel.findByIdAndUpdate(
      id,
      { status: 'checked-in' },
      { new: true }
    );
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    const roomdata = await RoomModel.findByIdAndUpdate(room, { status: 'occupied' });
    const user = await UserModel.findById(booking.guest);
    if (user?.email != null) {
      await notifyUser(user.email, `Your booking status is checked-in!. In room ${roomdata?.number}`);
    }
    return res.json(booking);
  } catch (err) {
    console.error('❌ checkIn error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const checkOut = async (req: Request, res: Response) => {
  try {
    const { id, room } = req.params;
    if (!id || !room) {
      return res.status(400).json({ message: 'Booking ID and room ID are required' });
    }
    const booking = await BookingModel.findByIdAndUpdate(
      id,
      { status: 'checked-out' },
      { new: true }
    );
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    await RoomModel.findByIdAndUpdate(room, { status: 'available' });
    return res.json(booking);
  } catch (err) {
    console.error('❌ checkOut error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
export const checkOuta = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { room } = req.body;
    if (!id || !room) {
      return res.status(400).json({ message: 'Booking ID and room ID are required' });
    }
    const booking = await BookingModel.findByIdAndUpdate(
      id,
      { status: 'checked-out' },
      { new: true }
    );
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    const roomdata = await RoomModel.findByIdAndUpdate(room, { status: 'available' });
    const user = await UserModel.findById(booking.guest);
    if (user?.email != null) {
      await notifyUser(user.email, `Your booking status is checked-out!. In room ${roomdata?.number}!. Thanks for staying with us!`);
    }
    return res.json(booking);
  } catch (err) {
    console.error('❌ checkOuta error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const cancelBooking = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ message: 'Booking ID is required' });
    }
    const booking = await BookingModel.findByIdAndUpdate(
      id,
      { status: 'cancelled' },
      { new: true }
    );
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    const user = await UserModel.findById(booking.guest);
    if (user?.email != null) {
      await notifyUser(user.email, `Your booking has been cancelled!`);
    }
    return res.json(booking);
  } catch (err) {
    console.error('❌ cancelBooking error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};


export const getAllBookings = async (_req: Request, res: Response) => {
  try {
    const bookings = await BookingModel.find().populate('guest').populate('room');
    return res.json(bookings);
  } catch (err) {
    console.error('❌ getAllBookings error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
