// utils/cloudinary.ts
import { v2 as cloudinary, UploadApiOptions } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';
import { Request } from 'express';

// Configure Cloudinary
const cloudinaryConfig = {
  cloud_name: process.env.CLOUDINARY_NAME || 'dnu7ntdut',
  api_key: process.env.CLOUDINARY_API_KEY || '756469128388989',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'dX1mhZUiIfgTLNS-jN4ppruYR64',
  secure: true
};

console.log('📁 Cloudinary Configuration:');
console.log('📁 Cloud Name:', cloudinaryConfig.cloud_name);
console.log('📁 API Key:', cloudinaryConfig.api_key ? '✓ Set' : '✗ Missing');

cloudinary.config(cloudinaryConfig);

// Define params for CloudinaryStorage - Using proper Cloudinary API options
interface CloudinaryParams {
  folder: string;
  allowed_formats: string[];
  transformation: Array<{
    width: number;
    height: number;
    crop: string;
    [key: string]: any;
  }>;
  public_id?: (req: Request, file: Express.Multer.File) => string | Promise<string>;
  [key: string]: any;
}

// Create storage for students
export const studentStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'students',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [{ width: 500, height: 500, crop: 'limit' }],
    public_id: (req: Request, file: Express.Multer.File) => {
      return `student_${Date.now()}_${Math.round(Math.random() * 1E9)}`;
    }
  } as any // Use 'as any' to bypass TypeScript strict checking for now
});

// Create storage for blogs
export const blogStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'blogs',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [{ width: 800, height: 400, crop: 'limit' }],
    public_id: (req: Request, file: Express.Multer.File) => {
      return `blog_${Date.now()}_${Math.round(Math.random() * 1E9)}`;
    }
  } as any
});

// Create multer upload instances
export const uploadStudentPhoto = multer({
  storage: studentStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(file.originalname.toLowerCase().match(/\.[0-9a-z]+$/i)?.[0] || '');
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
    }
  }
});

export const uploadBlogImage = multer({
  storage: blogStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(file.originalname.toLowerCase().match(/\.[0-9a-z]+$/i)?.[0] || '');
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
    }
  }
});

// Function to delete image from Cloudinary
export const deleteImageFromCloudinary = async (imageUrl: string): Promise<any> => {
  try {
    if (!imageUrl) {
      console.log('⚠️ No image URL provided for deletion');
      return null;
    }

    // Extract public_id from Cloudinary URL
    const urlParts = imageUrl.split('/');
    const publicIdWithExtension = urlParts[urlParts.length - 1];
    const publicId = publicIdWithExtension.split('.')[0];
    
    // Find the upload index
    const uploadIndex = urlParts.indexOf('upload');
    if (uploadIndex === -1) {
      console.log('⚠️ Not a valid Cloudinary URL:', imageUrl);
      return null;
    }

    // Get folder
    let fullPublicId = publicId;
    if (uploadIndex + 1 < urlParts.length) {
      const folder = urlParts[uploadIndex + 1];
      if (folder && folder !== 'v1' && folder !== 'v2') {
        fullPublicId = `${folder}/${publicId}`;
      }
    }

    console.log('🗑️ Deleting image from Cloudinary:', fullPublicId);
    const result = await cloudinary.uploader.destroy(fullPublicId);
    console.log('✅ Delete result:', result);
    return result;
  } catch (error: any) {
    console.error('❌ Error deleting image from Cloudinary:', error.message);
    return null;
  }
};

// Test Cloudinary connection
export const testCloudinaryConnection = async (): Promise<{ success: boolean; message: string }> => {
  try {
    const result = await cloudinary.api.ping();
    console.log('✅ Cloudinary connection test:', result);
    return { success: true, message: 'Cloudinary connected successfully' };
  } catch (error: any) {
    console.error('❌ Cloudinary connection failed:', error.message);
    return { success: false, message: error.message };
  }
};