import { Router } from "express";
import { protect } from "../middleware/auth.js";
import { authorize } from "../middleware/authorize.js";
import { createUser, deleteUserById, getUserById, getUserByRole, updateUserById, allUsers, getUserByEmail } from "../controllers/userController.js";
const router = Router();

router.get('/', protect, authorize(['admin']), allUsers);
router.get('/:id', protect, authorize(['admin']), getUserById);
router.post('/', createUser);
router.get('/email/:email', getUserByEmail);
router.put('/:id', protect, authorize(['admin']), updateUserById);
router.delete('/:id', protect, authorize(['admin']), deleteUserById);
router.get('/role/:role', protect, authorize(['admin']), getUserByRole);

export default router;