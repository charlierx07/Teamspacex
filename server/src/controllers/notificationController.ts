import { Response, NextFunction } from 'express';
import { Notification } from '../models/Notification.js';
import { AuthRequest } from '../middleware/auth.js';

export const getNotifications = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = req.user!;
    const notifications = await Notification.find({ recipient: user._id })
      .populate('sender', 'name email avatar')
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = await Notification.countDocuments({ recipient: user._id, read: false });

    res.status(200).json({ success: true, notifications, unreadCount });
  } catch (err: any) {
    next(err);
  }
};

export const markNotificationAsRead = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const user = req.user!;

    await Notification.findOneAndUpdate({ _id: id, recipient: user._id }, { read: true });

    res.status(200).json({ success: true, message: 'Notification marked as read' });
  } catch (err: any) {
    next(err);
  }
};

export const markAllNotificationsRead = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = req.user!;
    await Notification.updateMany({ recipient: user._id, read: false }, { read: true });

    res.status(200).json({ success: true, message: 'All notifications marked as read' });
  } catch (err: any) {
    next(err);
  }
};
