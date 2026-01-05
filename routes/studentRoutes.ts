import express from 'express';
import multer from 'multer';
import {
  getAllStudents,
  getStudent,
  createStudent,
  updateStudent,
  deleteStudent,
  updateStudentStatus,
  getStudentStatistics,
  getFilterOptions,
  getStudentPhotoById
} from '../controllers/studentController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Configure multer for memory storage
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const mimetype = allowedTypes.test(file.mimetype);
    const extname = allowedTypes.test(file.originalname.toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
    }
  }
});

// Public routes
router.get('/filter-options', getFilterOptions);

// Get student photo by ID (public access)
router.get('/:id/photo', getStudentPhotoById);

// Protected routes (require authentication)
router.get('/', authenticate, getAllStudents);
router.get('/stats', authenticate, getStudentStatistics);
router.get('/:id', authenticate, getStudent);
router.post('/', authenticate, upload.single('photo'), createStudent);
router.put('/:id', authenticate, upload.single('photo'), updateStudent);
router.patch('/:id/status', authenticate, updateStudentStatus);
router.delete('/:id', authenticate, deleteStudent);

export default router;