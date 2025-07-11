import { Router } from 'express';
import { createRoom, deleteRoom, getRooms, occupiedrooms, updateRoom, updateRoomStatus } from '../controllers/roomController.js';


const router = Router();

// Public: sab dekh sakta hai
router.get('/', getRooms); // admin, manager, receptionist, housekeeping
router.get('/occupiedrooms', occupiedrooms); // admin, manager, receptionist, housekeeping
// Admin/Manager create/edit/delete
router.post('/', createRoom); // admin manager
router.put('/:id', updateRoom); // admin manager
router.delete('/:id', deleteRoom); // admin

// Status update: housekeeping aur manager
router.patch('/:id/status', updateRoomStatus); // manager, housekeeping

export default router;
