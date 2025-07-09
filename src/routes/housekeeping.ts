import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import {
  scheduleTask,
  getTasks,
  updateTask,
  deleteTask
} from '../controllers/housekeepingController.js';

const router = Router();

router.post('/', protect, authorize(['manager','receptionist']), scheduleTask);
router.get('/', protect, authorize(['manager','receptionist','housekeeping']), getTasks);
router.patch('/:id', protect, authorize(['housekeeping','manager']), updateTask);
router.delete('/:id', protect, authorize(['manager']), deleteTask);

export default router;
