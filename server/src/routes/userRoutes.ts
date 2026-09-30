import { Router } from 'express';
import { getAllUsers, addMember, updateMember, resetMemberPassword, deleteMember } from '../controllers/userController.js';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/checkRole.js';

const router = Router();

router.use(authenticate);

router.get('/', getAllUsers); // Any authenticated user can view the team directory
router.post('/', requireAdmin, addMember);
router.patch('/:id', requireAdmin, updateMember);
router.post('/:id/reset-password', requireAdmin, resetMemberPassword);
router.delete('/:id', requireAdmin, deleteMember);

export default router;
