import { Router } from 'express';
import {
  login,
  logout,
  getMe,
  updateProfile,
  changePassword,
  deleteAccount,
  forgotPassword,
  resetPassword
} from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);
router.patch('/profile', authenticate, updateProfile);
router.post('/change-password', authenticate, changePassword);
router.delete('/account', authenticate, deleteAccount);

export default router;
