import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import {
  getAllStudents,
  getStudent,
  createStudent,
  updateStudent,
  deleteStudent,
  updateStudentStatus,
  getStudentStatistics,
  getFilterOptions
} from '../controllers/studentController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Create uploads directory if it doesn't exist
const createUploadsDirectory = () => {
  const projectRoot = process.cwd();
  const uploadPath = path.join(projectRoot, 'public', 'uploads', 'students');
  
  if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
  }
  
  return uploadPath;
};

// Initialize upload directory
const uploadPath = createUploadsDirectory();

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
    }
  }
});

// Public routes
router.get('/filter-options', getFilterOptions);

// Protected routes (require authentication)
router.get('/', authenticate, getAllStudents);
router.get('/stats', authenticate, getStudentStatistics);
router.get('/:id', authenticate, getStudent);
router.post('/', upload.single('photo'), createStudent);
router.put('/:id', authenticate, upload.single('photo'), updateStudent);
router.patch('/:id/status', authenticate, updateStudentStatus);
router.delete('/:id', authenticate, deleteStudent);

export default router;