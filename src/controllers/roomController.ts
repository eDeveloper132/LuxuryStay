import { Request, Response } from 'express';
import { RoomModel } from '../models/Room.js';
import { BookingModel } from '../models/Booking.js';

// 1. List all rooms
export const getRooms = async (_req: Request, res: Response) => {
  try {
    const rooms = await RoomModel.find();
    console.log('Getting Rooms:', rooms);
    return res.json(rooms);
  } catch (err) {
    console.error('❌ getRooms error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// 2. Create new room
export const createRoom = async (req: Request, res: Response) => {
  try {
    const payload = req.body;
    if (!payload.number || payload.price == null) {
      return res.status(400).json({ message: 'Required fields missing' });
    }
    const room = await RoomModel.create(payload);
    return res.status(201).json(room);
  } catch (err: any) {
    console.error('❌ createRoom error:', err);
    if (err.name === 'ValidationError') {
      return res.status(422).json({ message: err.message, errors: err.errors });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
};


// 3. Update room details
export const updateRoom = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ message: 'Room ID is required' });
    }
    const room = await RoomModel.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }
    return res.json(room);
  } catch (err: any) {
    console.error('❌ updateRoom error:', err);
    if (err.name === 'ValidationError') {
      return res.status(422).json({ message: err.message, errors: err.errors });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
};
// 4. Delete room
export const deleteRoom = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ message: 'Room ID is required' });
    }
    console.log(`Attempting to delete room with id: ${id}`);
    const bookings = await BookingModel.find({ room: id });
    if (bookings.some(b => b.status !== 'cancelled')) {
      console.log(`Cannot delete room ${id} because it has active bookings`);
      return res.status(400).json({ message: 'Cannot delete room: active bookings exist' });
    }
    const deleted = await RoomModel.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: 'Room not found' });
    }
    console.log(`Room ${id} deleted successfully`);
    return res.json({ message: 'Room deleted successfully' });
  } catch (err) {
    console.error('❌ deleteRoom error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// 5. Get occupied rooms count and list
export const occupiedRooms = async (_req: Request, res: Response) => {
  try {
    const count = await RoomModel.countDocuments({ status: 'occupied' });
    const list = await RoomModel.find({ status: 'occupied' });
    console.log('Occupied Rooms Count:', count);
    return res.json({ count, rooms: list });
  } catch (err) {
    console.error('❌ occupiedRooms error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// 6. Update status (e.g., cleaning → available)
export const updateRoomStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!id || !status) {
      return res.status(400).json({ message: 'Room ID and status are required' });
    }
    const room = await RoomModel.findByIdAndUpdate(id, { status }, { new: true, runValidators: true });
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }
    return res.json(room);
  } catch (err: any) {
    console.error('❌ updateRoomStatus error:', err);
    if (err.name === 'ValidationError') {
      return res.status(422).json({ message: err.message, errors: err.errors });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
};