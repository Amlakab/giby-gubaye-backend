import { Request, Response } from 'express';
import Blog, { IBlog } from '../models/Blog';
import User from '../models/User';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

// Helper functions
const successResponse = (res: Response, data: any, message: string = 'Success', statusCode: number = 200) => {
  res.status(statusCode).json({
    success: true,
    message,
    data
  });
};

const errorResponse = (res: Response, message: string = 'Error', statusCode: number = 500) => {
  res.status(statusCode).json({
    success: false,
    message
  });
};

// Generate unique slug
const generateUniqueSlug = async (title: string): Promise<string> => {
  let slug = title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-')
    .trim();
    
  let uniqueSlug = slug;
  let counter = 1;
  
  while (await Blog.findOne({ slug: uniqueSlug })) {
    uniqueSlug = `${slug}-${counter}`;
    counter++;
  }
  
  return uniqueSlug;
};

// Get all blogs with pagination and filtering (FOR ADMIN/DASHBOARD)
export const getAllBlogs = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string || '';
    const category = req.query.category as string || '';
    const status = req.query.status as string || '';
    const tag = req.query.tag as string || '';
    const author = req.query.author as string || '';
    const featured = req.query.featured as string || '';
    const sortBy = req.query.sortBy as string || 'createdAt';
    const sortOrder = req.query.sortOrder as string === 'asc' ? 1 : -1;

    const skip = (page - 1) * limit;

    // Build filter object
    const filter: any = {};
    
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (category) {
      filter.category = category;
    }
    
    if (status) {
      filter.status = status;
    }
    
    if (tag) {
      filter.tags = { $in: [tag] };
    }
    
    if (author && mongoose.Types.ObjectId.isValid(author)) {
      filter.createdBy = author;
    }
    
    if (featured === 'true') {
      filter.isFeatured = true;
    } else if (featured === 'false') {
      filter.isFeatured = false;
    }

    // Sort object
    const sort: any = {};
    sort[sortBy] = sortOrder;

    const blogs = await Blog.find(filter)
      .populate('createdBy', 'firstName lastName email avatar')
      .populate('approvedBy', 'firstName lastName email avatar')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const totalBlogs = await Blog.countDocuments(filter);
    const totalPages = Math.ceil(totalBlogs / limit);

    successResponse(res, {
      blogs,
      pagination: {
        currentPage: page,
        totalPages,
        totalBlogs,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    }, 'Blogs retrieved successfully');
  } catch (error: any) {
    console.error('Error fetching blogs:', error);
    errorResponse(res, error.message, 500);
  }
};

// Get only approved blogs (PUBLIC API - No authentication required)
export const getApprovedBlogs = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 12;
    const search = req.query.search as string || '';
    const category = req.query.category as string || '';
    const tag = req.query.tag as string || '';
    const author = req.query.author as string || '';
    const featured = req.query.featured as string || '';
    const sortBy = req.query.sortBy as string || 'blogDate';
    const sortOrder = req.query.sortOrder as string === 'asc' ? 1 : -1;

    const skip = (page - 1) * limit;

    // Build filter object - ONLY PUBLISHED BLOGS
    const filter: any = { status: 'published' };
    
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (category) {
      filter.category = category;
    }
    
    if (tag) {
      filter.tags = { $in: [tag] };
    }
    
    if (author && mongoose.Types.ObjectId.isValid(author)) {
      filter.createdBy = author;
    }
    
    if (featured === 'true') {
      filter.isFeatured = true;
    } else if (featured === 'false') {
      filter.isFeatured = false;
    }

    // Sort object
    const sort: any = {};
    sort[sortBy] = sortOrder;

    const blogs = await Blog.find(filter)
      .populate('createdBy', 'firstName lastName email avatar')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const totalBlogs = await Blog.countDocuments(filter);
    const totalPages = Math.ceil(totalBlogs / limit);

    successResponse(res, {
      blogs,
      pagination: {
        currentPage: page,
        totalPages,
        totalBlogs,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    }, 'Approved blogs retrieved successfully');
  } catch (error: any) {
    console.error('Error fetching approved blogs:', error);
    errorResponse(res, error.message, 500);
  }
};

// Get public blogs (published only)
export const getPublicBlogs = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 12;
    const search = req.query.search as string || '';
    const category = req.query.category as string || '';
    const tag = req.query.tag as string || '';
    const author = req.query.author as string || '';
    const featured = req.query.featured as string || '';
    const sortBy = req.query.sortBy as string || 'blogDate';
    const sortOrder = req.query.sortOrder as string === 'asc' ? 1 : -1;

    const skip = (page - 1) * limit;

    // Build filter object - only published blogs
    const filter: any = { status: 'published' };
    
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (category) {
      filter.category = category;
    }
    
    if (tag) {
      filter.tags = { $in: [tag] };
    }
    
    if (author && mongoose.Types.ObjectId.isValid(author)) {
      filter.createdBy = author;
    }
    
    if (featured === 'true') {
      filter.isFeatured = true;
    } else if (featured === 'false') {
      filter.isFeatured = false;
    }

    // Sort object
    const sort: any = {};
    sort[sortBy] = sortOrder;

    const blogs = await Blog.find(filter)
      .populate('createdBy', 'firstName lastName email avatar')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const totalBlogs = await Blog.countDocuments(filter);
    const totalPages = Math.ceil(totalBlogs / limit);

    successResponse(res, {
      blogs,
      pagination: {
        currentPage: page,
        totalPages,
        totalBlogs,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    }, 'Public blogs retrieved successfully');
  } catch (error: any) {
    console.error('Error fetching public blogs:', error);
    errorResponse(res, error.message, 500);
  }
};

// Get single blog by ID or slug
export const getBlog = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    let blog;
    
    if (mongoose.Types.ObjectId.isValid(id)) {
      blog = await Blog.findById(id)
        .populate('createdBy', 'firstName lastName email avatar role')
        .populate('approvedBy', 'firstName lastName email avatar');
    } else {
      blog = await Blog.findOne({ slug: id })
        .populate('createdBy', 'firstName lastName email avatar role')
        .populate('approvedBy', 'firstName lastName email avatar');
    }
    
    if (!blog) {
      return errorResponse(res, 'Blog not found', 404);
    }

    successResponse(res, blog, 'Blog retrieved successfully');
  } catch (error: any) {
    errorResponse(res, error.message, 500);
  }
};

// Get public single blog (only published)
export const getPublicBlog = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    let blog;
    
    if (mongoose.Types.ObjectId.isValid(id)) {
      blog = await Blog.findOne({ _id: id, status: 'published' })
        .populate('createdBy', 'firstName lastName email avatar')
        .populate('approvedBy', 'firstName lastName email avatar');
    } else {
      blog = await Blog.findOne({ slug: id, status: 'published' })
        .populate('createdBy', 'firstName lastName email avatar')
        .populate('approvedBy', 'firstName lastName email avatar');
    }
    
    if (!blog) {
      return errorResponse(res, 'Blog not found or not published', 404);
    }

    successResponse(res, blog, 'Blog retrieved successfully');
  } catch (error: any) {
    errorResponse(res, error.message, 500);
  }
};

// Create new blog (DEFAULT STATUS TO PENDING)
export const createBlog = async (req: Request, res: Response) => {
  try {
    const {
      title,
      description,
      category,
      tags,
      metaTitle,
      metaDescription,
      metaKeywords,
      content,
      blogDate
    } = req.body;

    // Get user ID from request
    const createdBy = (req as any).user?._id;
    if (!createdBy) {
      return errorResponse(res, 'User not authenticated', 401);
    }

    // Check if user exists
    const user = await User.findById(createdBy);
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    // Generate unique slug
    const slug = await generateUniqueSlug(title);

    // Handle image upload
    let image = '';
    if (req.file) {
      image = `/uploads/blogs/${req.file.filename}`;
    }

    // Parse tags if it's a string
    let tagsArray: string[] = [];
    if (tags) {
      if (typeof tags === 'string') {
        tagsArray = tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
      } else if (Array.isArray(tags)) {
        tagsArray = tags;
      }
    }

    // Parse metaKeywords if provided
    let metaKeywordsArray: string[] = [];
    if (metaKeywords) {
      if (typeof metaKeywords === 'string') {
        metaKeywordsArray = metaKeywords.split(',').map(keyword => keyword.trim()).filter(keyword => keyword.length > 0);
      } else if (Array.isArray(metaKeywords)) {
        metaKeywordsArray = metaKeywords;
      }
    }

    // Calculate reading time
    let readingTime = 0;
    if (content) {
      const wordCount = content.split(/\s+/).length;
      readingTime = Math.ceil(wordCount / 200);
    }

    const newBlog = new Blog({
      title,
      description,
      content: content || '',
      category,
      createdBy,
      slug,
      image,
      tags: tagsArray,
      metaTitle: metaTitle || title,
      metaDescription: metaDescription || description.substring(0, 150),
      metaKeywords: metaKeywordsArray,
      status: 'pending', // ALWAYS SET TO PENDING BY DEFAULT
      isFeatured: false, // Default to false
      viewsCount: 0,
      readingTime,
      blogDate: blogDate ? new Date(blogDate) : new Date()
    });

    await newBlog.save();
    
    // Populate author info
    const populatedBlog = await Blog.findById(newBlog._id)
      .populate('createdBy', 'firstName lastName email avatar');
    
    successResponse(res, populatedBlog, 'Blog created successfully');
  } catch (error: any) {
    console.error('Error creating blog:', error);
    if (error.code === 11000) {
      return errorResponse(res, 'Blog with this slug already exists', 400);
    }
    errorResponse(res, error.message, 500);
  }
};

// Update blog
export const updateBlog = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse(res, 'Invalid blog ID', 400);
    }

    const blog = await Blog.findById(id);
    if (!blog) {
      return errorResponse(res, 'Blog not found', 404);
    }

    // Check if user has permission (admin or the author)
    const userId = (req as any).user?._id;
    const userRole = (req as any).user?.role;
    
    // For non-admin users, they can only update their own blogs
    if (blog.createdBy.toString() !== userId.toString() && userRole !== 'admin' && userRole !== 'moderator') {
      return errorResponse(res, 'Not authorized to update this blog', 403);
    }

    // For regular users, remove status field from update
    if (blog.createdBy.toString() === userId.toString() && userRole !== 'admin' && userRole !== 'moderator') {
      delete req.body.status;
      delete req.body.isFeatured;
      delete req.body.approvalNotes;
    }

    // Handle image upload
    if (req.file) {
      // Delete old image if exists
      if (blog.image) {
        const oldImagePath = path.join(process.cwd(), 'public', blog.image);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      req.body.image = `/uploads/blogs/${req.file.filename}`;
    }

    // Handle tags
    if (req.body.tags) {
      if (typeof req.body.tags === 'string') {
        req.body.tags = req.body.tags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag.length > 0);
      }
    }

    // Handle metaKeywords
    if (req.body.metaKeywords) {
      if (typeof req.body.metaKeywords === 'string') {
        req.body.metaKeywords = req.body.metaKeywords.split(',').map((keyword: string) => keyword.trim()).filter((keyword: string) => keyword.length > 0);
      }
    }

    // If title is changed, update slug
    if (req.body.title && req.body.title !== blog.title) {
      req.body.slug = await generateUniqueSlug(req.body.title);
    }

    // Update blogDate if provided
    if (req.body.blogDate) {
      req.body.blogDate = new Date(req.body.blogDate);
    }

    // Update reading time if content is provided
    if (req.body.content) {
      const wordCount = req.body.content.split(/\s+/).length;
      req.body.readingTime = Math.ceil(wordCount / 200);
    }

    // If status is being changed to published/rejected by admin/moderator
    if (req.body.status && ['published', 'rejected'].includes(req.body.status) && blog.status !== req.body.status) {
      req.body.approvedBy = (req as any).user?._id;
      req.body.approvedAt = new Date();
      
      // Only set approval notes if provided
      if (req.body.approvalNotes) {
        req.body.approvalNotes = req.body.approvalNotes;
      }
    }

    const updatedBlog = await Blog.findByIdAndUpdate(
      id,
      { ...req.body },
      { new: true, runValidators: true }
    )
    .populate('createdBy', 'firstName lastName email avatar')
    .populate('approvedBy', 'firstName lastName email avatar');

    successResponse(res, updatedBlog, 'Blog updated successfully');
  } catch (error: any) {
    console.error('Error updating blog:', error);
    if (error.code === 11000) {
      return errorResponse(res, 'Blog with this slug already exists', 400);
    }
    errorResponse(res, error.message, 500);
  }
};

// Update blog status
export const updateBlogStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, approvalNotes } = req.body;

    const validStatuses = ['draft', 'pending', 'published', 'archived', 'rejected'];
    if (!validStatuses.includes(status)) {
      return errorResponse(res, 'Invalid status', 400);
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse(res, 'Invalid blog ID', 400);
    }

    const blog = await Blog.findById(id);
    if (!blog) {
      return errorResponse(res, 'Blog not found', 404);
    }

    const userId = (req as any).user?._id;
    const userRole = (req as any).user?.role;
    
    // Check permissions based on status change
    if (status === 'published' || status === 'rejected') {
      // Only admin/moderator can publish or reject
      if (userRole !== 'admin' && userRole !== 'moderator') {
        return errorResponse(res, 'Only admin or moderator can publish or reject blogs', 403);
      }
    } else if (blog.createdBy.toString() !== userId.toString() && userRole !== 'admin' && userRole !== 'moderator') {
      // For other status changes, author or admin/moderator can do it
      return errorResponse(res, 'Not authorized to update this blog', 403);
    }

    const updateData: any = {
      status
    };

    // If publishing or rejecting, set approval info
    if (status === 'published' || status === 'rejected') {
      updateData.approvedBy = userId;
      updateData.approvedAt = new Date();
      if (approvalNotes) {
        updateData.approvalNotes = approvalNotes;
      }
      
      // If publishing for first time, set blogDate to now
      if (status === 'published' && blog.status !== 'published') {
        updateData.blogDate = new Date();
      }
    }

    const updatedBlog = await Blog.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    )
    .populate('createdBy', 'firstName lastName email avatar')
    .populate('approvedBy', 'firstName lastName email avatar');

    successResponse(res, updatedBlog, `Blog status updated to ${status} successfully`);
  } catch (error: any) {
    errorResponse(res, error.message, 500);
  }
};

// Toggle featured status
export const toggleFeatured = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { isFeatured } = req.body;

    if (typeof isFeatured !== 'boolean') {
      return errorResponse(res, 'isFeatured must be a boolean value', 400);
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse(res, 'Invalid blog ID', 400);
    }

    // Only admin can toggle featured status
    const userRole = (req as any).user?.role;
    if (userRole !== 'admin' && userRole !== 'moderator') {
      return errorResponse(res, 'Only admin or moderator can toggle featured status', 403);
    }

    const blog = await Blog.findById(id);
    if (!blog) {
      return errorResponse(res, 'Blog not found', 404);
    }

    const updatedBlog = await Blog.findByIdAndUpdate(
      id,
      { isFeatured },
      { new: true, runValidators: true }
    )
    .populate('createdBy', 'firstName lastName email avatar');

    successResponse(res, updatedBlog, `Blog ${isFeatured ? 'featured' : 'unfeatured'} successfully`);
  } catch (error: any) {
    errorResponse(res, error.message, 500);
  }
};

// Delete blog
export const deleteBlog = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse(res, 'Invalid blog ID', 400);
    }

    const blog = await Blog.findById(id);
    if (!blog) {
      return errorResponse(res, 'Blog not found', 404);
    }

    // Check if user has permission (admin, moderator or the author)
    const userId = (req as any).user?._id;
    const userRole = (req as any).user?.role;
    
    if (blog.createdBy.toString() !== userId.toString() && userRole !== 'admin' && userRole !== 'moderator') {
      return errorResponse(res, 'Not authorized to delete this blog', 403);
    }

    // Delete image if exists
    if (blog.image) {
      const imagePath = path.join(process.cwd(), 'public', blog.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await Blog.findByIdAndDelete(id);

    successResponse(res, null, 'Blog deleted successfully');
  } catch (error: any) {
    errorResponse(res, error.message, 500);
  }
};

// Increment view count
export const incrementViews = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    let blog;
    
    if (mongoose.Types.ObjectId.isValid(id)) {
      blog = await Blog.findOneAndUpdate(
        { _id: id },
        { $inc: { viewsCount: 1 } },
        { new: true }
      );
    } else {
      blog = await Blog.findOneAndUpdate(
        { slug: id },
        { $inc: { viewsCount: 1 } },
        { new: true }
      );
    }
    
    if (!blog) {
      return errorResponse(res, 'Blog not found', 404);
    }

    successResponse(res, blog, 'View count incremented');
  } catch (error: any) {
    errorResponse(res, error.message, 500);
  }
};

// Get blog statistics (FIXED VERSION)
export const getBlogStatistics = async (req: Request, res: Response) => {
  try {
    // Get user ID for filtering (if non-admin)
    const userId = (req as any).user?._id;
    const userRole = (req as any).user?.role;
    
    // Build match filter based on user role
    let matchFilter: any = {};
    if (userRole !== 'admin' && userRole !== 'moderator') {
      matchFilter.createdBy = userId;
    }

    const totalBlogs = await Blog.countDocuments(matchFilter);
    const publishedBlogs = await Blog.countDocuments({ ...matchFilter, status: 'published' });
    const draftBlogs = await Blog.countDocuments({ ...matchFilter, status: 'draft' });
    const pendingBlogs = await Blog.countDocuments({ ...matchFilter, status: 'pending' });
    const rejectedBlogs = await Blog.countDocuments({ ...matchFilter, status: 'rejected' });
    const archivedBlogs = await Blog.countDocuments({ ...matchFilter, status: 'archived' });
    const featuredBlogs = await Blog.countDocuments({ ...matchFilter, isFeatured: true });
    
    // Calculate total views
    const totalViewsResult = await Blog.aggregate([
      { $match: matchFilter },
      { 
        $group: { 
          _id: null, 
          totalViews: { $sum: '$viewsCount' } 
        } 
      }
    ]);
    const totalViews = totalViewsResult[0]?.totalViews || 0;
    
    // Group by category
    const categoryStats = await Blog.aggregate([
      { $match: { ...matchFilter, category: { $ne: null } } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Group by status
    const statusStats = await Blog.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Group by month
    const monthlyStats = await Blog.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Top viewed blogs
    const topViewedBlogs = await Blog.find({ ...matchFilter, status: 'published' })
      .sort({ viewsCount: -1 })
      .limit(5)
      .select('title viewsCount slug category')
      .lean();

    // Top authors (only for admin/moderator)
    // Explicitly type the array
    let topAuthors: Array<{
      _id: {
        _id: mongoose.Types.ObjectId;
        firstName?: string;
        lastName?: string;
        email?: string;
      };
      count: number;
      totalViews: number;
    }> = [];
    
    if (userRole === 'admin' || userRole === 'moderator') {
      const topAuthorsAgg = await Blog.aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: '$createdBy',
            count: { $sum: 1 },
            totalViews: { $sum: '$viewsCount' }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]);

      // Populate author names
      const authorIds = topAuthorsAgg.map(a => a._id).filter((id): id is mongoose.Types.ObjectId => id != null);
      const authors = await User.find(
        { _id: { $in: authorIds } },
        '_id firstName lastName email'
      );

      // Use type assertion to fix the property access issue
      topAuthors = topAuthorsAgg.map(agg => {
        const author = authors.find(a => a._id.toString() === agg._id.toString());
        const userDoc = author as any; // Type assertion to avoid TypeScript errors
        
        return {
          _id: { 
            _id: agg._id,
            firstName: userDoc?.firstName,
            lastName: userDoc?.lastName,
            email: userDoc?.email
          },
          count: agg.count,
          totalViews: agg.totalViews
        };
      });
    }

    successResponse(res, {
      totalPending: pendingBlogs,
      totalPublished: publishedBlogs,
      totalRejected: rejectedBlogs,
      totalDraft: draftBlogs,
      totalBlogs,
      archivedBlogs,
      featuredBlogs,
      totalViews,
      categoryStats,
      statusStats,
      monthlyStats,
      topViewedBlogs,
      topAuthors
    }, 'Statistics retrieved successfully');
  } catch (error: any) {
    console.error('Error fetching stats:', error);
    errorResponse(res, error.message, 500);
  }
};

// Get unique values for filters
export const getFilterOptions = async (req: Request, res: Response) => {
  try {
    // Get user ID for filtering (if non-admin)
    const userId = (req as any).user?._id;
    const userRole = (req as any).user?.role;
    
    let matchFilter: any = {};
    if (userRole !== 'admin' && userRole !== 'moderator') {
      matchFilter.createdBy = userId;
    }

    const categories = await Blog.distinct('category', matchFilter);
    const tags = await Blog.distinct('tags', matchFilter);
    const authors = await Blog.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$createdBy'
        }
      },
      { $limit: 50 }
    ]);

    // Get author details
    const authorIds = authors.map(a => a._id).filter((id): id is mongoose.Types.ObjectId => id != null);
    const authorDetails = await User.find(
      { _id: { $in: authorIds } },
      '_id firstName lastName email'
    );

    successResponse(res, {
      categories: categories.filter(Boolean).sort(),
      tags: tags.filter(Boolean).sort(),
      authors: authorDetails
    }, 'Filter options retrieved successfully');
  } catch (error: any) {
    console.error('Error fetching filter options:', error);
    errorResponse(res, error.message, 500);
  }
};

// Get public filter options (only from published blogs)
export const getPublicFilterOptions = async (req: Request, res: Response) => {
  try {
    const categories = await Blog.distinct('category', { status: 'published' });
    const tags = await Blog.distinct('tags', { status: 'published' });
    const authors = await Blog.aggregate([
      { $match: { status: 'published' } },
      {
        $group: {
          _id: '$createdBy'
        }
      },
      { $limit: 50 }
    ]);

    // Get author details
    const authorIds = authors.map(a => a._id).filter((id): id is mongoose.Types.ObjectId => id != null);
    const authorDetails = await User.find(
      { _id: { $in: authorIds } },
      '_id firstName lastName email'
    );

    successResponse(res, {
      categories: categories.filter(Boolean).sort(),
      tags: tags.filter(Boolean).sort(),
      authors: authorDetails
    }, 'Public filter options retrieved successfully');
  } catch (error: any) {
    console.error('Error fetching public filter options:', error);
    errorResponse(res, error.message, 500);
  }
};

// Get related blogs
export const getRelatedBlogs = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const blog = await Blog.findById(id).select('category tags');
    if (!blog) {
      return errorResponse(res, 'Blog not found', 404);
    }

    const relatedBlogs = await Blog.find({
      _id: { $ne: id },
      status: 'published',
      $or: [
        { category: blog.category },
        { tags: { $in: blog.tags } }
      ]
    })
    .sort({ viewsCount: -1, createdAt: -1 })
    .limit(4)
    .select('title description image slug viewsCount readingTime blogDate')
    .populate('createdBy', 'firstName lastName')
    .lean();

    successResponse(res, relatedBlogs, 'Related blogs retrieved successfully');
  } catch (error: any) {
    errorResponse(res, error.message, 500);
  }
};

// Approve or reject blog
export const approveBlog = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, approvalNotes } = req.body;

    const validStatuses = ['published', 'rejected'];
    if (!validStatuses.includes(status)) {
      return errorResponse(res, 'Invalid status. Must be published or rejected', 400);
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse(res, 'Invalid blog ID', 400);
    }

    // Only admin or moderator can approve/reject blogs
    const userRole = (req as any).user?.role;
    if (userRole !== 'admin' && userRole !== 'moderator') {
      return errorResponse(res, 'Only admin or moderator can approve blogs', 403);
    }

    const blog = await Blog.findById(id);
    if (!blog) {
      return errorResponse(res, 'Blog not found', 404);
    }

    // Check if blog is pending review
    if (blog.status !== 'pending') {
      return errorResponse(res, `Blog is already ${blog.status}`, 400);
    }

    const updateData: any = {
      status,
      approvalNotes: approvalNotes || '',
      approvedBy: (req as any).user?._id,
      approvedAt: new Date()
    };

    // If publishing, set blogDate to now
    if (status === 'published') {
      updateData.blogDate = new Date();
    }

    const updatedBlog = await Blog.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    )
    .populate('createdBy', 'firstName lastName email avatar')
    .populate('approvedBy', 'firstName lastName email avatar');

    successResponse(res, updatedBlog, `Blog ${status} successfully`);
  } catch (error: any) {
    console.error('Error approving blog:', error);
    errorResponse(res, error.message, 500);
  }
};

// Get blogs for approval queue
export const getApprovalQueue = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string || '';
    const category = req.query.category as string || '';
    const author = req.query.author as string || '';
    const sortBy = req.query.sortBy as string || 'createdAt';
    const sortOrder = req.query.sortOrder as string === 'asc' ? 1 : -1;

    const skip = (page - 1) * limit;

    // Build filter object for pending blogs
    const filter: any = { status: 'pending' };
    
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (category) {
      filter.category = category;
    }
    
    if (author && mongoose.Types.ObjectId.isValid(author)) {
      filter.createdBy = author;
    }

    // Sort object
    const sort: any = {};
    sort[sortBy] = sortOrder;

    const blogs = await Blog.find(filter)
      .populate('createdBy', 'firstName lastName email avatar')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const totalBlogs = await Blog.countDocuments(filter);
    const totalPages = Math.ceil(totalBlogs / limit);

    successResponse(res, {
      blogs,
      pagination: {
        currentPage: page,
        totalPages,
        totalBlogs,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    }, 'Approval queue retrieved successfully');
  } catch (error: any) {
    console.error('Error fetching approval queue:', error);
    errorResponse(res, error.message, 500);
  }
};