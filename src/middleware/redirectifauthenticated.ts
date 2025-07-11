import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const redirectIfAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies.token as string | undefined;
  if (token) {
    try {
      jwt.verify(token, process.env.JWT_SECRET!);
      // Token valid hai, dashboard pe bhej do
      return res.redirect('/');
    } catch {
      // Invalid token — allow to continue to login/signup
    }
  }
  next();
};
