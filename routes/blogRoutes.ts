import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import {
  getAllBlogs,
  getBlog,
  createBlog,
  updateBlog,
  deleteBlog,
  updateBlogStatus,
  toggleFeatured,
  incrementViews,
  getBlogStatistics,
  getFilterOptions,
  getRelatedBlogs,
  approveBlog,
  getApprovalQueue,
  getPublicBlogs,
  getPublicBlog,
  getPublicFilterOptions,
  getApprovedBlogs // NEW: Add this import
} from '../controllers/blogController';
import { authenticate, authorize } from '../middleware/auth';

const router = express.Router();

// Create uploads directory if it doesn't exist
const createUploadsDirectory = () => {
  const projectRoot = process.cwd();
  const uploadPath = path.join(projectRoot, 'public', 'uploads', 'blogs');
  
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

// Public routes (No authentication required)
router.get('/public/approved', getApprovedBlogs); // NEW: Get only approved blogs
router.get('/public', getPublicBlogs);
router.get('/public/filter-options', getPublicFilterOptions);
router.get('/public/:id', getPublicBlog);
router.get('/:id/view', incrementViews); // Public view increment

// Protected routes (require authentication)
router.get('/', authenticate, getAllBlogs);
router.get('/filter-options', authenticate, getFilterOptions);
router.get('/stats', authenticate, getBlogStatistics);
router.get('/approval-queue', authenticate, getApprovalQueue);
router.get('/:id/related', authenticate, getRelatedBlogs);
router.get('/:id', authenticate, getBlog);
router.post('/', authenticate, upload.single('image'), createBlog);
router.put('/:id', authenticate, upload.single('image'), updateBlog);
router.patch('/:id/status', authenticate, updateBlogStatus);
router.patch('/:id/featured', authenticate, toggleFeatured);
router.patch('/:id/approve', authenticate, approveBlog);
router.delete('/:id', authenticate, deleteBlog);

export default router;