import { Router } from 'express';
import {
  getTableById,
  createTable,
  addRow,
  updateRow,
  deleteRow,
  deleteTable
} from '../controllers/tableController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/:id', getTableById);
router.post('/', createTable);
router.post('/:id/rows', addRow);
router.patch('/:id/rows/:rowId', updateRow);
router.delete('/:id/rows/:rowId', deleteRow);
router.delete('/:id', deleteTable);

export default router;
