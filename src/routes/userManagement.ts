import { Router } from "express";
import { createUser, deleteUserById, getUserById, getUserByRole, updateUserById, allUsers, getUserByEmail } from "../controllers/userController.js";
const router = Router();

router.get('/', allUsers); // admin
router.get('/:id', getUserById); // admin
router.post('/', createUser);
router.get('/email/:email', getUserByEmail);
router.put('/:id', updateUserById); // admin
router.delete('/:id', deleteUserById); // admin
router.get('/role/:role', getUserByRole); // admin

export default router;