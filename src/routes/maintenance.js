import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { reportIssue, getIssues, updateIssue } from '../controllers/maintenanceController.js';
const router = Router();
router.post('/', protect, authorize(['guest', 'receptionist', 'manager']), reportIssue);
router.get('/', protect, authorize(['manager', 'housekeeping']), getIssues);
router.patch('/:id', protect, authorize(['manager', 'housekeeping']), updateIssue);
export default router;
