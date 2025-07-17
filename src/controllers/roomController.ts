import { Request, Response } from 'express';
import { RoomModel } from '../models/Room.js';
import { BookingModel } from '../models/Booking.js';

// 1. List all rooms
export const getRooms = async (_req: Request, res: Response) => {
  const rooms = await RoomModel.find();
  console.log("Getting Rooms:",rooms)
  res.json(rooms);
};

// 2. Create new room
export const createRoom = async (req: Request, res: Response) => {
  const room = await RoomModel.create(req.body);
  res.status(201).json(room);
};

// 3. Update room details
export const updateRoom = async (req: Request, res: Response) => {
  const { id } = req.params;
  const room = await RoomModel.findByIdAndUpdate(id, req.body, { new: true });
  if (!room) return res.status(404).json({ message: 'Room nahin mili' });
  res.json(room);
};

// 4. Delete room
export const deleteRoom = async (req: Request, res: Response) => {
  const { id } = req.params;
  console.log(`Attempting to delete room with id: ${id}`);
  const booked = (await BookingModel.find()).filter(b => b.room.toString() === id);
  const status = booked.some(b => b.status === 'cancelled') ? 'cancelled' : 'occupied';
  if (status === 'occupied') {
    console.log(`Cannot delete room ${id} because it has bookings`);
    return res.status(400).json({ message: 'You are not able to delete this room because it is booked' });
  }
  await RoomModel.findByIdAndDelete(id);
  console.log(`Room ${id} deleted successfully`);
  res.json({ message: 'Room delete hogayi' });
};

export const occupiedrooms = async (req: Request, res: Response) => {
  const rooms = await RoomModel.countDocuments({ status: 'occupied' });
  const occupied = await RoomModel.find({ status: 'occupied' }) || [{}];
  console.log("Occupied Rooms:",rooms);
  console.log("Occupied:",rooms);
  res.json({rooms,occupied});
}

// 5. Update status (e.g., cleaning → available)
export const updateRoomStatus = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;
  const room = await RoomModel.findByIdAndUpdate(id, { status }, { new: true });
  if (!room) return res.status(404).json({ message: 'Room nahin mili' });
  res.json(room);
};
