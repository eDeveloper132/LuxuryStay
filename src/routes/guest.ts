import express from 'express';
import { protect } from '../middleware/auth.js';
import { getMyProfile, updateMyProfile } from '../controllers/guestController.js';

const router = express.Router();

router.get('/me', protect, getMyProfile);
router.put('/me', protect, updateMyProfile);

export default router;
