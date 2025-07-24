import { Router } from 'express';
import { register, login, resend_verification } from '../controllers/authController.js';
const router = Router();
router.post('/register', register);
router.post('/login', login);
router.post('/resend-verification', resend_verification);
export default router;
