import express from 'express';
import multer from 'multer';
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
  getApprovedBlogs,
  getBlogImageById
} from '../controllers/blogController';
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

// Public routes (No authentication required)
router.get('/public/approved', getApprovedBlogs);
router.get('/public', getPublicBlogs);
router.get('/public/filter-options', getPublicFilterOptions);
router.get('/public/:id', getPublicBlog);
router.get('/:id/view', incrementViews); // Public view increment

// Get blog image by ID or slug (public access)
router.get('/:id/image', getBlogImageById);

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