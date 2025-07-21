import { HousekeepingModel } from '../models/Housekeeping.js';
// 1. New task schedule
export const scheduleTask = async (req, res) => {
    try {
        const { room, task, scheduledAt } = req.body;
        if (!room || !task || !scheduledAt) {
            return res.status(400).json({ message: 'room, task and scheduledAt are required' });
        }
        const hk = await HousekeepingModel.create({ room, task, scheduledAt });
        req.app.get('io')?.emit('housekeeping:scheduled', hk);
        return res.status(201).json(hk);
    }
    catch (err) {
        console.error('❌ scheduleTask error:', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
// 2. View tasks
export const getTasks = async (_req, res) => {
    try {
        const tasks = await HousekeepingModel.find().populate('room assignedTo');
        return res.json(tasks);
    }
    catch (err) {
        console.error('❌ getTasks error:', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
// 3. Update task status/assign
export const updateTask = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        if (!id) {
            return res.status(400).json({ message: 'Task ID is required' });
        }
        const task = await HousekeepingModel.findByIdAndUpdate(id, updates, { new: true });
        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }
        req.app.get('io')?.emit('housekeeping:updated', task);
        return res.json(task);
    }
    catch (err) {
        console.error('❌ updateTask error:', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
// 4. Delete task
export const deleteTask = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ message: 'Task ID is required' });
        }
        const deleted = await HousekeepingModel.findByIdAndDelete(id);
        if (!deleted) {
            return res.status(404).json({ message: 'Task not found' });
        }
        req.app.get('io')?.emit('housekeeping:deleted', { id });
        return res.json({ message: 'Task deleted' });
    }
    catch (err) {
        console.error('❌ deleteTask error:', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
