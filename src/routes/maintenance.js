import { Router } from 'express';
import { reportIssue, getIssues, updateIssue } from '../controllers/maintenanceController.js';
const router = Router();
router.post('/', reportIssue); // guest, receptionist, manager
router.get('/', getIssues); // manager, housekeeping
router.patch('/:id', updateIssue); // manager, housekeeping
export default router;
