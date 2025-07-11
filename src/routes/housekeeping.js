import { Router } from 'express';
import { scheduleTask, getTasks, updateTask, deleteTask } from '../controllers/housekeepingController.js';
const router = Router();
router.post('/', scheduleTask); // manager, receptionist
router.get('/', getTasks); // manager, receptionist, housekeeping
router.patch('/:id', updateTask); // housekeeping, manager
router.delete('/:id', deleteTask); // manager
export default router;
