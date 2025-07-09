import { HousekeepingModel } from '../models/Housekeeping.js';
// 1. New task schedule
export const scheduleTask = async (req, res) => {
    const { room, task, scheduledAt } = req.body;
    const hk = await HousekeepingModel.create({ room, task, scheduledAt });
    // Broadcast via Socket.io (agar setup ho)
    req.app.get('io')?.emit('housekeeping:scheduled', hk);
    res.status(201).json(hk);
};
// 2. View tasks
export const getTasks = async (_req, res) => {
    const tasks = await HousekeepingModel.find().populate('room assignedTo');
    res.json(tasks);
};
// 3. Update task status/assign
export const updateTask = async (req, res) => {
    const { id } = req.params;
    const updates = req.body; // { status, assignedTo, completedAt }
    const task = await HousekeepingModel.findByIdAndUpdate(id, updates, { new: true });
    req.app.get('io')?.emit('housekeeping:updated', task);
    res.json(task);
};
// 4. Delete task
export const deleteTask = async (req, res) => {
    const { id } = req.params;
    await HousekeepingModel.findByIdAndDelete(id);
    req.app.get('io')?.emit('housekeeping:deleted', { id });
    res.json({ message: 'Task deleted' });
};
