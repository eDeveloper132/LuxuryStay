import express from 'express';
import { getMyProfile, updateMyProfile } from '../controllers/guestController.js';
const router = express.Router();
router.get('/me', getMyProfile); // guest
router.put('/me', updateMyProfile); // guest
export default router;
