import express from 'express';
import {
  getAllFamilies,
  getFamily,
  createFamily,
  updateFamily,
  updateFamilyStatus,
  addChildrenToFamily,
  removeChildFromFamily,
  deleteFamily,
  getFamilyStatistics,
  getFamilyFilterOptions,
  getStudentsForFamilySelection,
  getAllBatches,
  getUserFamilies,
  autoAssignChildren,
  executeAutoAssignChildren
} from '../controllers/familyController';
import { authenticate, authorize } from '../middleware/auth';

const router = express.Router();

// Public routes (no authentication required for batches)
router.get('/batches', getAllBatches);

// Protected routes
router.use(authenticate);

// Filter and selection routes
router.get('/filter-options', getFamilyFilterOptions);
router.get('/students/selection', getStudentsForFamilySelection);

// Add this route after the existing routes, before export
router.post('/auto-assign-children', authenticate, autoAssignChildren);
router.post('/execute-auto-assign', authenticate, executeAutoAssignChildren); 

// Family CRUD routes
router.get('/', getAllFamilies);
router.get('/user', getUserFamilies);
router.get('/stats', getFamilyStatistics);
router.get('/:id', getFamily);
router.post('/', createFamily);
router.put('/:id', updateFamily);
router.patch('/:id/status', updateFamilyStatus);
router.post('/:id/children', addChildrenToFamily);
router.delete('/:id/children', removeChildFromFamily);
router.delete('/:id', deleteFamily);

export default router;