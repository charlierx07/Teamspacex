import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET, USER_STATUS } from '../config/constants.js';
import { User, IUser } from '../models/User.js';
import { TokenBlacklist } from '../models/TokenBlacklist.js';

export interface AuthRequest extends Request {
  user?: IUser;
  token?: string;
}

interface JwtPayload {
  id: string;
  email: string;
  role: string;
  tokenVersion?: number;
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | undefined;

    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
      return;
    }

    // 1. Check if token has been explicitly blacklisted (e.g. after logout)
    const isBlacklisted = await TokenBlacklist.findOne({ token });
    if (isBlacklisted) {
      res.status(401).json({ success: false, message: 'Session has been revoked. Please log in again.' });
      return;
    }

    // 2. Cryptographic signature and expiry verification
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    const user = await User.findById(decoded.id);

    if (!user) {
      res.status(401).json({ success: false, message: 'User account no longer exists.' });
      return;
    }

    if (user.status !== USER_STATUS.ACTIVE) {
      res.status(403).json({ success: false, message: 'Account is deactivated or disabled. Please contact your Admin.' });
      return;
    }

    // 3. Verify token version (invalidates tokens issued prior to a password change or global reset)
    if (decoded.tokenVersion !== undefined && decoded.tokenVersion !== (user.tokenVersion || 0)) {
      res.status(401).json({ success: false, message: 'Session expired due to a password reset. Please log in again.' });
      return;
    }

    req.user = user;
    req.token = token;
    next();
  } catch (err: any) {
    res.status(401).json({ success: false, message: 'Invalid or expired session token.' });
  }
};
