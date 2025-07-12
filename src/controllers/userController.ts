import { Request, Response } from 'express';
import { UserModel } from '../models/User.js';
import bcrypt from 'bcrypt';

export const allUsers = async (req: Request, res: Response) => {
    const users = await UserModel.find();
    console.log(users)
    res.json(users);
};
export const getUserById = async (req: Request, res: Response) => {
    const user = await UserModel.findById(req.params.id);
    res.json(user);
};
export const getUserByRole = async (req: Request, res: Response) => {
    const user = await UserModel.findOne({ role: req.params.role });
    res.json(user);
};
export const getUserByEmail = async (req: Request, res: Response) => {
    const user = await UserModel.findOne({ email: req.params.email });
    res.json(user);
};
export const updateUserById = async (req: Request, res: Response) => {
    const user = await UserModel.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(user);
};
export const deleteUserById = async (req: Request, res: Response) => {
    const user = await UserModel.findByIdAndDelete(req.params.id);
    res.json(user);
};
export const createUser = async (req: Request, res: Response) => {
    const { name, email, password, role } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await UserModel.create({
        name,
        email,
        password: hashedPassword,
        role
    });
    res.status(201).json(user);
};