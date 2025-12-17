import express from 'express';
import { authenticate } from '../middleware/auth';
import {
  getJobs,
  getEligibleStudents,
  assignJob,
  updateJob,
  deleteJob,
  getJobStats,
  getAllJobsByStudentId,
} from '../controllers/jobController';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get job assignments for current user's class
router.get('/', getJobs);

// Get eligible students for job assignment
router.get('/eligible-students', getEligibleStudents);

// Get job statistics
router.get('/stats', getJobStats);

// Assign job to student
router.post('/assign', assignJob);

// Update job (sub_class and background)
router.patch('/:id', updateJob);

// Delete job assignment
router.delete('/:id', deleteJob);

router.get('/student/:studentId/all', getAllJobsByStudentId);

export default router;