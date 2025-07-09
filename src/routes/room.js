import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { createRoom, deleteRoom, getRooms, occupiedrooms, updateRoom, updateRoomStatus } from '../controllers/roomController.js';
const router = Router();
// Public: sab dekh sakta hai
router.get('/', protect, authorize(['admin', 'manager', 'receptionist', 'housekeeping']), getRooms);
router.get('/occupiedrooms', protect, authorize(['admin', 'manager', 'receptionist', 'housekeeping']), occupiedrooms);
// Admin/Manager create/edit/delete
router.post('/', protect, authorize(['admin', 'manager']), createRoom);
router.put('/:id', protect, authorize(['admin', 'manager']), updateRoom);
router.delete('/:id', protect, authorize(['admin']), deleteRoom);
// Status update: housekeeping aur manager
router.patch('/:id/status', protect, authorize(['manager', 'housekeeping']), updateRoomStatus);
export default router;
