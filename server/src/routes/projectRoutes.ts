import { Router } from 'express';
import { getProjects, getProjectById, createProject, updateProject, deleteProject } from '../controllers/projectController.js';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/checkRole.js';

const router = Router();

router.use(authenticate);

router.get('/', getProjects);
router.post('/', createProject);
router.get('/:id', getProjectById);
router.patch('/:id', updateProject);
router.delete('/:id', requireAdmin, deleteProject);

export default router;
