import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { MaintenanceModel } from '../models/Mantenance.js';

// 1. Report issue
export const reportIssue = async (req: AuthRequest, res: Response) => {
  const { room, description } = req.body;
  const issue = await MaintenanceModel.create({
    room, description,
    reportedBy: req.user!.id,
    reportedAt: new Date()
  });
  req.app.get('io')?.emit('maintenance:reported', issue);
  res.status(201).json(issue);
};

// 2. View all issues
export const getIssues = async (_req: Request, res: Response) => {
  const issues = await MaintenanceModel.find().populate('room reportedBy');
  res.json(issues);
};

// 3. Update issue status
export const updateIssue = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const updates = req.body; // { status, resolvedAt }
  const issue = await MaintenanceModel.findByIdAndUpdate(id, updates, { new: true });
  req.app.get('io')?.emit('maintenance:updated', issue);
  res.json(issue);
};
