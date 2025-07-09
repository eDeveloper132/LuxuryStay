import { RoomModel } from '../models/Room.js';
// 1. List all rooms
export const getRooms = async (_req, res) => {
    const rooms = await RoomModel.find();
    res.json(rooms);
};
// 2. Create new room
export const createRoom = async (req, res) => {
    const room = await RoomModel.create(req.body);
    res.status(201).json(room);
};
// 3. Update room details
export const updateRoom = async (req, res) => {
    const { id } = req.params;
    const room = await RoomModel.findByIdAndUpdate(id, req.body, { new: true });
    if (!room)
        return res.status(404).json({ message: 'Room nahin mili' });
    res.json(room);
};
// 4. Delete room
export const deleteRoom = async (req, res) => {
    const { id } = req.params;
    await RoomModel.findByIdAndDelete(id);
    res.json({ message: 'Room delete hogayi' });
};
export const occupiedrooms = async (req, res) => {
    const rooms = await RoomModel.countDocuments({ status: 'occupied' });
    res.json(rooms);
};
// 5. Update status (e.g., cleaning → available)
export const updateRoomStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const room = await RoomModel.findByIdAndUpdate(id, { status }, { new: true });
    if (!room)
        return res.status(404).json({ message: 'Room nahin mili' });
    res.json(room);
};
