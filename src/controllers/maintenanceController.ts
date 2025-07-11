import { Request, Response } from 'express';
import { MaintenanceModel } from '../models/Mantenance.js';

export const reportIssue = async (req: Request, res: Response) => {
  try {
    const { room, description } = req.body;
    if (!room || !description) {
      return res.status(400).json({ message: 'room and description are required' });
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
      reportedBy: currentUser.id,    // now guaranteed to exist
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
export const getIssues = async (_req: Request, res: Response) => {
  try {
    const issues = await MaintenanceModel.find().populate('room reportedBy');
    return res.json(issues);
  } catch (err) {
    console.error('❌ getIssues error:', err);
    return res.status(500).json({ message: 'Failed to fetch issues' });
  }
};

export const updateIssue = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'Invalid issue ID format' });
    }

    const updates = req.body;
    const issue = await MaintenanceModel.findByIdAndUpdate(id, updates, { new: true });
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
    return res.status(500).json({ message: 'Failed to update issue' });
  }
};
