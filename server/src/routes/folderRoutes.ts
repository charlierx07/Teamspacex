import { Router } from 'express';
import { getFolders, getFolderById, createFolder, updateFolder, deleteFolder } from '../controllers/folderController.js';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/checkRole.js';

const router = Router();

router.use(authenticate);

router.get('/', getFolders);
router.post('/', createFolder);
router.get('/:id', getFolderById);
router.patch('/:id', updateFolder);
router.delete('/:id', requireAdmin, deleteFolder);

export default router;
