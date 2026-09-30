import { Router } from 'express';
import { getUserPermissions, updateUserPermissions } from '../controllers/permissionController.js';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/checkRole.js';

const router = Router();
router.use(authenticate);

router.get('/user/:userId', requireAdmin, getUserPermissions);
router.post('/user/:userId', requireAdmin, updateUserPermissions);

export default router;
