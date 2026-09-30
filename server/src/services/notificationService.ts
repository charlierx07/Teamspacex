import mongoose from 'mongoose';
import { Notification, INotification } from '../models/Notification.js';
import { io } from '../sockets/socketHandler.js';

interface CreateNotificationParams {
  recipient: mongoose.Types.ObjectId | string;
  sender?: mongoose.Types.ObjectId | string;
  type: 'TASK_ASSIGNED' | 'PROJECT_ADDED' | 'FOLDER_ACCESS' | 'PAGE_EDITED' | 'PERMISSION_CHANGED' | 'SYSTEM';
  message: string;
  resourceType?: string;
  resourceId?: mongoose.Types.ObjectId | string;
}

export const sendNotification = async (params: CreateNotificationParams): Promise<INotification | null> => {
  try {
    // Avoid sending notification if sender is recipient
    if (params.sender && params.sender.toString() === params.recipient.toString()) {
      return null;
    }

    const notification = await Notification.create({
      recipient: params.recipient,
      sender: params.sender || null,
      type: params.type,
      message: params.message,
      resourceType: params.resourceType || '',
      resourceId: params.resourceId || null,
      read: false
    });

    const populated = await Notification.findById(notification._id).populate('sender', 'name email avatar');

    if (io) {
      io.to(`user:${params.recipient.toString()}`).emit('NEW_NOTIFICATION', populated);
    }

    return notification;
  } catch (err) {
    console.error('Failed to create notification:', err);
    return null;
  }
};
