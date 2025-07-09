import { Request, Response } from 'express';
import { UserModel } from '../models/User.js';

export const allUsers = async (req: Request, res: Response) => {
    const users = await UserModel.find();
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
    const user = await UserModel.create(req.body);
    res.status(201).json(user);
};