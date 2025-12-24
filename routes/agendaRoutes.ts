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
  getApprovalQueue,
  getUsersByIds,
  getStudentsByIds
} from '../controllers/agendaController';
import { authenticate, authorize } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Public routes (for authenticated users)
router.get('/', getAllAgendas);
router.get('/stats', getAgendaStatistics);
router.get('/filter-options', getFilterOptions);
router.get('/approval-queue', getApprovalQueue);
router.get('/:id', getAgenda);

// Protected routes
router.post('/', createAgenda);
router.put('/:id', updateAgenda);
router.delete('/:id', deleteAgenda);

// Approval routes - only for admin/moderator
router.patch('/:id/approve', authenticate, approveAgenda);
router.patch('/:id/continue', continueAgenda);

// Student lookup route
router.post('/students/by-ids', getStudentsByIds);  // Add this route
router.post('/users/by-ids', getUsersByIds);  // New route for user lookup

export default router;