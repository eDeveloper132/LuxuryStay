import { Request, Response } from 'express';
import { MaintenanceModel } from '../models/Mantenance.js';

// 1. Report maintenance issue
export const reportIssue = async (req: Request, res: Response) => {
  try {
    const { room, description } = req.body;
    if (!room || !description) {
      return res.status(400).json({ message: 'roomId and description are required' });
    }

    const rawUser = req.cookies.user as string | undefined;
    const currentUser = rawUser ? JSON.parse(rawUser) : null;
    if (!currentUser?.id) {
      console.error('⚠️ reportIssue: no id on currentUser cookie:', currentUser);
      return res.status(401).json({ message: 'Not authenticated—invalid user cookie' });
    }

    const issue = await MaintenanceModel.create({
      room,
      description,
      reportedBy: currentUser.id,
      reportedAt: new Date(),
    });

    req.app.get('io')?.emit('maintenance:reported', issue);
    return res.status(201).json(issue);
  } catch (err: any) {
    console.error('❌ reportIssue error:', err);
    if (err.name === 'ValidationError') {
      return res.status(422).json({ message: err.message, errors: err.errors });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// 2. Get all issues
export const getIssues = async (_req: Request, res: Response) => {
  try {
    const issues = await MaintenanceModel.find()
      .populate('room')
      .populate('reportedBy', 'name email');
    return res.json(issues);
  } catch (err) {
    console.error('❌ getIssues error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// 3. Update issue status/details
export const updateIssue = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ message: 'Issue ID is required' });
    }

    const updates = req.body;
    const issue = await MaintenanceModel.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
    if (!issue) {
      return res.status(404).json({ message: `No issue found with ID ${id}` });
    }

    req.app.get('io')?.emit('maintenance:updated', issue);
    return res.json(issue);
  } catch (err: any) {
    console.error('❌ updateIssue error:', err);
    if (err.name === 'ValidationError') {
      return res.status(422).json({ message: err.message, errors: err.errors });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
};
// 4. Delete issue (optional handler)
export const deleteIssue = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ message: 'Issue ID is required' });
    }

    const deleted = await MaintenanceModel.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: `No issue found with ID ${id}` });
    }

    req.app.get('io')?.emit('maintenance:deleted', { id });
    return res.json({ message: 'Issue deleted' });
  } catch (err) {
    console.error('❌ deleteIssue error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
