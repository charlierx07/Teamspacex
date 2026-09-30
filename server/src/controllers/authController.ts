import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { TokenBlacklist } from '../models/TokenBlacklist.js';
import { AuthRequest } from '../middleware/auth.js';
import { JWT_SECRET, JWT_EXPIRES_IN, NODE_ENV, USER_STATUS } from '../config/constants.js';
import { logActivity } from '../services/activityService.js';

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ success: false, message: 'Please provide both email and password.' });
      return;
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail }).select('+passwordHash');

    if (!user) {
      res.status(401).json({ success: false, message: 'Invalid credentials or user not authorized.' });
      return;
    }

    if (user.status !== USER_STATUS.ACTIVE) {
      res.status(403).json({ success: false, message: 'Your account has been deactivated. Contact Admin.' });
      return;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.status(401).json({ success: false, message: 'Invalid credentials.' });
      return;
    }

    user.lastLoginAt = new Date();
    await user.save();

    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        role: user.role,
        tokenVersion: user.tokenVersion || 0
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN as any }
    );

    // Set HTTP-only secure cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    logActivity({
      actor: user._id,
      action: 'USER_LOGIN',
      resourceType: 'USER',
      resourceId: user._id,
      resourceTitle: user.name
    }).catch((e) => console.error('Activity error:', e));

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        avatar: user.avatar,
        title: user.title
      }
    });
  } catch (err: any) {
    next(err);
  }
};

export const logout = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = req.token || (req.cookies && req.cookies.token);
    if (token) {
      try {
        const decoded: any = jwt.decode(token);
        const expiresAt = decoded?.exp
          ? new Date(decoded.exp * 1000)
          : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await TokenBlacklist.create({ token, expiresAt });
      } catch (e) {
        // Ignore duplicate key error if already blacklisted
      }
    }

    if (req.user) {
      logActivity({
        actor: req.user._id,
        action: 'USER_LOGOUT',
        resourceType: 'USER',
        resourceId: req.user._id,
        resourceTitle: req.user.name
      }).catch(() => {});
    }

    res.clearCookie('token', {
      httpOnly: true,
      secure: NODE_ENV === 'production',
      sameSite: 'lax'
    });
    res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (err: any) {
    next(err);
  }
};

export const getMe = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Not authenticated' });
    return;
  }

  res.status(200).json({
    success: true,
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      status: req.user.status,
      avatar: req.user.avatar,
      title: req.user.title,
      createdAt: req.user.createdAt
    }
  });
};

export const updateProfile = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated' });
      return;
    }

    const { name, title, avatar } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    if (name) user.name = name.trim();
    if (title) user.title = title.trim();
    if (avatar !== undefined) user.avatar = avatar.trim();

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        avatar: user.avatar,
        title: user.title
      }
    });
  } catch (err: any) {
    next(err);
  }
};

export const changePassword = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated' });
      return;
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({ success: false, message: 'Current and new password required' });
      return;
    }

    if (newPassword.length < 8) {
      res.status(400).json({ success: false, message: 'New password must be at least 8 characters' });
      return;
    }

    const user = await User.findById(req.user._id).select('+passwordHash');
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      res.status(400).json({ success: false, message: 'Incorrect current password' });
      return;
    }

    const bcrypt = await import('bcryptjs');
    user.passwordHash = await bcrypt.hash(newPassword, 12);
    // Invalidate all existing sessions globally on password change
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    res.status(200).json({ success: true, message: 'Password updated successfully. Other active sessions have been invalidated.' });
  } catch (err: any) {
    next(err);
  }
};

export const deleteAccount = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated' });
      return;
    }

    const { password } = req.body;
    if (!password) {
      res.status(400).json({ success: false, message: 'Current password is required to verify account deletion.' });
      return;
    }

    const user = await User.findById(req.user._id).select('+passwordHash');
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.status(400).json({ success: false, message: 'Invalid password. Account deletion aborted.' });
      return;
    }

    // If user is ADMIN, check if they are the sole admin in their workspace
    if (user.role === 'ADMIN') {
      const adminCount = await User.countDocuments({
        workspaceId: user.workspaceId,
        role: 'ADMIN',
        status: 'ACTIVE'
      });
      if (adminCount <= 1) {
        res.status(400).json({
          success: false,
          message: 'Cannot delete the sole Administrator account. Please promote another Admin before deleting your account.'
        });
        return;
      }
    }

    const userId = user._id;

    // 1. Remove permissions
    const { Permission } = await import('../models/Permission.js');
    await Permission.deleteMany({ userId });

    // 2. Remove personal notifications
    const { Notification } = await import('../models/Notification.js');
    await Notification.deleteMany({ $or: [{ recipient: userId }, { sender: userId }] });

    // 3. Remove user from all workspace members arrays
    const { Workspace } = await import('../models/Workspace.js');
    await Workspace.updateMany({}, { $pull: { members: userId } });

    // 4. Delete the User record permanently (removing name, email, avatar, etc.)
    await User.findByIdAndDelete(userId);

    // 5. Log anonymized activity
    logActivity({
      actor: userId,
      action: 'ACCOUNT_DELETED',
      resourceType: 'USER',
      resourceId: userId,
      resourceTitle: 'Deleted User',
      workspaceId: user.workspaceId?.toString()
    }).catch(() => {});

    // 6. Clear auth cookie
    res.clearCookie('token', {
      httpOnly: true,
      secure: NODE_ENV === 'production',
      sameSite: 'lax'
    });

    res.status(200).json({
      success: true,
      message: 'Your account and personal data have been permanently deleted.'
    });
  } catch (err: any) {
    next(err);
  }
};

/**
 * Initiates self-service password reset.
 * Generates a single-use, 32-byte cryptographically random token with 15-minute expiration.
 * Stores only the SHA-256 hash in the database to protect against database leaks.
 */
export const forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ success: false, message: 'Email is required.' });
      return;
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail });

    if (user && user.status === USER_STATUS.ACTIVE) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

      user.resetPasswordToken = hashedToken;
      // Strict 15-minute expiration
      user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000);
      await user.save();
    }

    // Generic response prevents account enumeration attacks
    res.status(200).json({
      success: true,
      message: 'If that email is registered and active, password reset instructions have been generated.'
    });
  } catch (err: any) {
    next(err);
  }
};

/**
 * Completes password reset with the provided token and new password.
 * Validates single-use, 15-minute expiration, clears tokens, and increments tokenVersion to revoke old sessions.
 */
export const resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      res.status(400).json({ success: false, message: 'Reset token and new password are required.' });
      return;
    }

    if (newPassword.length < 8) {
      res.status(400).json({ success: false, message: 'New password must be at least 8 characters long.' });
      return;
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() }
    }).select('+passwordHash +resetPasswordToken +resetPasswordExpires');

    if (!user) {
      res.status(400).json({
        success: false,
        message: 'Password reset token is invalid or has expired (15 minute limit).'
      });
      return;
    }

    const bcrypt = await import('bcryptjs');
    user.passwordHash = await bcrypt.hash(newPassword, 12);
    // Enforce single-use: clear reset token fields immediately
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    // Invalidate all previously issued JWT tokens across all devices
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password has been reset successfully. Please log in with your new password.'
    });
  } catch (err: any) {
    next(err);
  }
};
