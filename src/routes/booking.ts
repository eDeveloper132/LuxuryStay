import { Router } from 'express';
import {
  createBooking,
  getMyBookings,
  checkIn,
  checkOut,
  cancelBooking,
  getAllBookings,
  todaysBookings
} from '../controllers/bookingController.js';

const router = Router();

// Guest reservation & view their bookings
router.post('/', createBooking); // guest, admin
router.get('/todaysbookings', todaysBookings);
router.get('/me',  getMyBookings); // guest
router.patch('/:id/checkin', checkIn); // receptionist, manager
router.patch('/:id/checkout', checkOut); // receptionist, manager
router.patch('/:id/cancel', cancelBooking); // guest, manager, admin

// Admin sab bookings dekh sakta hai
router.get('/', getAllBookings); // admin manager

export default router;
