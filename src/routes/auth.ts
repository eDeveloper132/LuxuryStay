import { Router } from 'express';
import { register, login, resend_verification, verify_email } from '../controllers/authController.js';

const router = Router();
router.post('/register', register);
router.post('/login', login);
router.post('/resend-verification', resend_verification);
router.post('/verify-email', verify_email)
export default router;
