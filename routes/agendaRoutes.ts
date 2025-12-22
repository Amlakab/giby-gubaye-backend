import express from 'express';
import {
  getAllAgendas,
  getAgenda,
  createAgenda,
  updateAgenda,
  deleteAgenda,
  approveAgenda,
  continueAgenda,
  getAgendaStatistics,
  getFilterOptions,
  getApprovalQueue
} from '../controllers/agendaController';
import { authenticate, authorize } from '../middleware/auth';

const router = express.Router();

// Public routes (if needed)
// Currently all routes require authentication

// Protected routes (require authentication)
router.get('/', authenticate, getAllAgendas);
router.get('/filter-options', authenticate, getFilterOptions);
router.get('/stats', authenticate, getAgendaStatistics);
router.get('/approval-queue', authenticate, getApprovalQueue);
router.get('/:id', authenticate, getAgenda);
router.post('/', authenticate, createAgenda);
router.put('/:id', authenticate, updateAgenda);
router.patch('/:id/approve', authenticate, approveAgenda);
router.patch('/:id/continue', authenticate, continueAgenda);
router.delete('/:id', authenticate, deleteAgenda);

export default router;