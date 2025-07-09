import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.js';

// roles array pass karen, jo roles allow hain
export const authorize = (allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const userRole = req.user?.role;
    if (!userRole || !allowedRoles.includes(userRole)) {
      return res.status(403).json({ message: 'Access mana kiya gaya' });
    }
    next();
  };
};
