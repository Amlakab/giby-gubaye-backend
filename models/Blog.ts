import mongoose, { Document, Schema } from 'mongoose';

export interface IBlog extends Document {
  title: string;
  description: string;
  content?: string;
  image?: string; // Keep for frontend compatibility
  imageData?: {
    data: Buffer;
    contentType: string;
    fileName: string;
  }; // Store actual image data
  category: string;
  createdBy: mongoose.Types.ObjectId;
  blogDate: Date;
  slug: string;
  status: 'draft' | 'published' | 'archived' | 'pending' | 'rejected';
  tags: string[];
  isFeatured: boolean;
  viewsCount: number;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string[];
  readingTime?: number;
  approvalNotes?: string;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const blogSchema = new Schema<IBlog>({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    minlength: [10, 'Title must be at least 10 characters'],
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    minlength: [50, 'Description must be at least 50 characters'],
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  content: {
    type: String,
    default: ''
  },
  image: {
    type: String,
    default: ''
  },
  imageData: {
    data: Buffer,
    contentType: String,
    fileName: String
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    trim: true
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Author is required']
  },
  blogDate: {
    type: Date,
    default: Date.now
  },
  slug: {
    type: String,
    required: [true, 'Slug is required'],
    unique: true,
    trim: true,
    lowercase: true
  },
  status: {
    type: String,
    enum: ['draft', 'pending', 'published', 'archived', 'rejected'],
    default: 'draft'
  },
  tags: {
    type: [String],
    default: []
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  viewsCount: {
    type: Number,
    default: 0
  },
  metaTitle: {
    type: String,
    trim: true
  },
  metaDescription: {
    type: String,
    trim: true,
    maxlength: [160, 'Meta description cannot exceed 160 characters']
  },
  metaKeywords: {
    type: [String],
    default: []
  },
  readingTime: {
    type: Number,
    default: 0
  },
  approvalNotes: {
    type: String,
    default: ''
  },
  approvedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
blogSchema.index({ slug: 1 }, { unique: true });
blogSchema.index({ status: 1 });
blogSchema.index({ category: 1 });
blogSchema.index({ createdBy: 1 });
blogSchema.index({ isFeatured: 1 });
blogSchema.index({ blogDate: -1 });
blogSchema.index({ viewsCount: -1 });
blogSchema.index({ tags: 1 });
blogSchema.index({ approvedBy: 1 });

// Generate slug from title before saving
blogSchema.pre('save', function(next) {
  if (!this.isModified('title')) return next();
  
  // Generate slug from title
  this.slug = this.title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-')
    .trim();
    
  // Generate meta title if not provided
  if (!this.metaTitle) {
    this.metaTitle = this.title;
  }
  
  // Generate meta description if not provided
  if (!this.metaDescription) {
    this.metaDescription = this.description.substring(0, 150);
  }
  
  // Generate reading time estimate (200 words per minute)
  if (this.content) {
    const wordCount = this.content.split(/\s+/).length;
    this.readingTime = Math.ceil(wordCount / 200);
  }
  
  next();
});

// Virtual for author information
blogSchema.virtual('author', {
  ref: 'User',
  localField: 'createdBy',
  foreignField: '_id',
  justOne: true
});

// Virtual for approver information
blogSchema.virtual('approver', {
  ref: 'User',
  localField: 'approvedBy',
  foreignField: '_id',
  justOne: true
});

// Static method to increment view count
blogSchema.statics.incrementViews = async function(slug: string) {
  return this.findOneAndUpdate(
    { slug },
    { $inc: { viewsCount: 1 } },
    { new: true }
  );
};

export default mongoose.model<IBlog>('Blog', blogSchema);