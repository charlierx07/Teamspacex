import { Router } from 'express';
import {
  getPages,
  getPageById,
  createPage,
  updatePage,
  deletePage,
  getPageRevisions,
  restorePageRevision
} from '../controllers/pageController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', getPages);
router.post('/', createPage);
router.get('/:id', getPageById);
router.patch('/:id', updatePage);
router.delete('/:id', deletePage);
router.get('/:id/revisions', getPageRevisions);
router.post('/:id/revisions/:versionId/restore', restorePageRevision);

export default router;
