import { Router } from 'express';
import { getDashboardStats, getAdminStats } from '../controllers/statsController.js';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/checkRole.js';

const router = Router();
router.use(authenticate);

router.get('/dashboard', getDashboardStats);
router.get('/admin', requireAdmin, getAdminStats);

export default router;
