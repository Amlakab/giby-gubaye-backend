import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { generateOTP, storeOTP, verifyOTP } from '../utils/otpGenerator';
import { successResponse, errorResponse } from '../utils/helpers';

export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, phone, background, studentId, password, role } = req.body;

    // Validate required fields
    if (!name || !email || !phone || !studentId || !password) {
      return errorResponse(res, 'Name, email, phone, student ID and password are required', 400);
    }

    // Check if user already exists with phone number
    const existingUserByPhone = await User.findOne({ phone });
    if (existingUserByPhone) {
      return errorResponse(res, 'User already exists with this phone number', 400);
    }

    // Check if user already exists with email
    const existingUserByEmail = await User.findOne({ email });
    if (existingUserByEmail) {
      return errorResponse(res, 'User already exists with this email', 400);
    }

    // Create user data object
    const userData: any = {
      name,
      email,
      phone,
      background: background || '',
      studentId,
      password,
      role: role || 'user'
    };

    // Create new user
    const user = new User(userData);
    await user.save();

    // Generate token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET!, { expiresIn: '7d' });

    successResponse(res, {
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        background: user.background,
        studentId: user.studentId,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    }, 'Registration successful', 201);
  } catch (error: any) {
    // Handle duplicate key errors
    if (error.code === 11000) {
      if (error.keyPattern?.email) {
        return errorResponse(res, 'Email is already registered', 400);
      }
      if (error.keyPattern?.phone) {
        return errorResponse(res, 'Phone number is already registered', 400);
      }
    }
    errorResponse(res, error.message, 500);
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { phone, password } = req.body;

    // Find user by phone
    const user = await User.findOne({ phone });
    if (!user) {
      return errorResponse(res, 'Invalid credentials', 400);
    }

    // Check if user is active
    if (!user.isActive) {
      return errorResponse(res, 'Your account has been deactivated. Please contact support.', 403);
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return errorResponse(res, 'Invalid credentials', 400);
    }

    // Generate token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET!, { expiresIn: '7d' });

    successResponse(res, {
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        background: user.background,
        studentId: user.studentId,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    }, 'Login successful');
  } catch (error: any) {
    errorResponse(res, error.message, 500);
  }
};

export const sendOtp = async (req: Request, res: Response) => {
  try {
    const { phone } = req.body;

    // Check if user exists
    const user = await User.findOne({ phone });
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    // Generate OTP
    const otp = generateOTP();
    storeOTP(phone, otp);

    // In a real application, you would send the OTP via SMS
    // For development, we'll return it in the response
    console.log(`OTP for ${phone}: ${otp}`);

    successResponse(res, { otp: process.env.NODE_ENV === 'development' ? otp : null }, 'OTP sent successfully');
  } catch (error: any) {
    errorResponse(res, error.message, 500);
  }
};

export const loginWithOtp = async (req: Request, res: Response) => {
  try {
    const { phone, otp } = req.body;

    // Check if user exists
    const user = await User.findOne({ phone });
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    // Verify OTP
    if (!verifyOTP(phone, otp)) {
      return errorResponse(res, 'Invalid or expired OTP', 400);
    }

    // Generate token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET!, { expiresIn: '7d' });

    successResponse(res, {
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        background: user.background,
        studentId: user.studentId,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    }, 'Login successful');
  } catch (error: any) {
    errorResponse(res, error.message, 500);
  }
};

export const getProfile = async (req: Request, res: Response) => {
  try {
    // Assuming req.user is set by authentication middleware
    const user = req.user;
    
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    successResponse(res, {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      background: user.background,
      studentId: user.studentId,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }, 'Profile retrieved successfully');
  } catch (error: any) {
    errorResponse(res, error.message, 500);
  }
};

export const changePassword = async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user!._id);

    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    // Check current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return errorResponse(res, 'Current password is incorrect', 400);
    }

    // Update password
    user.password = newPassword;
    await user.save();

    successResponse(res, null, 'Password updated successfully');
  } catch (error: any) {
    errorResponse(res, error.message, 500);
  }
};