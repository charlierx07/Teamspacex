import { Router } from 'express';
import { getCurrentWorkspace, updateCurrentWorkspace, createWorkspace } from '../controllers/workspaceController.js';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/checkRole.js';

const router = Router();

router.use(authenticate);

router.get('/current', getCurrentWorkspace);
router.patch('/current', requireAdmin, updateCurrentWorkspace);
router.post('/', requireAdmin, createWorkspace);

export default router;
