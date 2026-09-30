import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.js';
import { ROLES } from '../config/constants.js';

export const requireAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user || req.user.role !== ROLES.ADMIN) {
    res.status(403).json({
      success: false,
      message: 'Access denied. Administrator privileges required.'
    });
    return;
  }
  next();
};
