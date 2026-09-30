import { Router } from 'express';
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsRead
} from '../controllers/notificationController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/', getNotifications);
router.patch('/:id/read', markNotificationAsRead);
router.post('/mark-all-read', markAllNotificationsRead);

export default router;
