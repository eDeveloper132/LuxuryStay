import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import {
  createBooking,
  getMyBookings,
  checkIn,
  checkOut,
  cancelBooking,
  getAllBookings
} from '../controllers/bookingController.js';

const router = Router();

// Guest reservation & view their bookings
router.post('/', protect, authorize(['guest']), createBooking);
router.get('/todaysbookings', createBooking);
router.get('/me', protect, authorize(['guest']), getMyBookings);
router.patch('/:id/checkin', protect, authorize(['receptionist','manager']), checkIn);
router.patch('/:id/checkout', protect, authorize(['receptionist','manager']), checkOut);
router.patch('/:id/cancel', protect, authorize(['guest','manager','admin']), cancelBooking);

// Admin sab bookings dekh sakta hai
router.get('/', protect, authorize(['admin','manager']), getAllBookings);

export default router;
