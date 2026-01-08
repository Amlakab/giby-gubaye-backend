import { Request, Response } from 'express';
import User, { IUser } from '../models/User';
import Student from '../models/Student';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

// Get all users with filtering and pagination - UPDATED WITH PHOTODATA
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      role = '', 
      status = '' 
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    // Build query
    let query: any = {};

    // Role filter
    if (role) {
      query.role = role;
    }

    // Status filter
    if (status) {
      if (status === 'active') {
        query.isActive = true;
      } else if (status === 'inactive') {
        query.isActive = false;
      }
    }

    // Search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { gibyGubayeId: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    // Execute query with FULL student population - INCLUDING PHOTODATA
    const users = await User.find(query)
      .populate({
        path: 'studentId',
        select: 'firstName middleName lastName phone email gender motherName block dorm university college department batch region zone wereda kebele church authority job motherTongue additionalLanguages dateOfBirth emergencyContact attendsCourse courseName courseChurch isActive createdAt updatedAt photo photoData gibyGubayeId'
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .exec();

    const totalUsers = await User.countDocuments(query);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(totalUsers / Number(limit)),
          totalUsers,
          hasNext: Number(page) * Number(limit) < totalUsers,
          hasPrev: Number(page) > 1,
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get single user by ID - UPDATED WITH PHOTODATA
export const getUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format',
      });
    }

    const user = await User.findById(userId)
      .populate({
        path: 'studentId',
        select: 'firstName middleName lastName phone email gender motherName block dorm university college department batch region zone wereda kebele church authority job motherTongue additionalLanguages dateOfBirth emergencyContact attendsCourse courseName courseChurch isActive createdAt updatedAt photo photoData gibyGubayeId'
      });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error: any) {
    console.error('Error fetching user:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Create new user - UPDATED
export const createUser = async (req: Request, res: Response) => {
  try {
    const { name, email, phone, background, studentId, password, role } = req.body;

    // Validate student exists
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    // Check if user already exists with email or phone
    const existingUser = await User.findOne({
      $or: [{ email }, { phone }],
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: existingUser.email === email 
          ? 'Email already exists' 
          : 'Phone number already exists',
      });
    }

    // Get gibyGubayeId from student
    const gibyGubayeId = student.gibyGubayeId || '';

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    const user = new User({
      gibyGubayeId,
      name,
      email,
      phone,
      background,
      studentId,
      password: hashedPassword,
      role: role || 'user',
      isActive: true,
    });

    await user.save();

    // Populate student data for response
    const populatedUser = await User.findById(user._id)
      .populate({
        path: 'studentId',
        select: 'firstName middleName lastName phone email gender motherName block dorm university college department batch region zone wereda kebele church authority job motherTongue additionalLanguages dateOfBirth emergencyContact attendsCourse courseName courseChurch isActive createdAt updatedAt photo photoData gibyGubayeId'
      });

    res.status(201).json({
      success: true,
      data: populatedUser,
      message: 'User created successfully',
    });
  } catch (error: any) {
    console.error('Error creating user:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Update user status (active/inactive) - UPDATED
export const updateUserStatus = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { isActive } = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      { isActive },
      { new: true }
    ).populate({
      path: 'studentId',
      select: 'firstName middleName lastName phone email gender motherName block dorm university college department batch region zone wereda kebele church authority job motherTongue additionalLanguages dateOfBirth emergencyContact attendsCourse courseName courseChurch isActive createdAt updatedAt photo photoData gibyGubayeId'
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      data: user,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
    });
  } catch (error: any) {
    console.error('Error updating user status:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Update user information - UPDATED
export const updateUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { name, email, phone, background, studentId, role } = req.body;

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check if email is being changed and if it's already taken
    if (email && email !== user.email) {
      const existingEmail = await User.findOne({ email });
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: 'Email already exists',
        });
      }
    }

    // Check if phone is being changed and if it's already taken
    if (phone && phone !== user.phone) {
      const existingPhone = await User.findOne({ phone });
      if (existingPhone) {
        return res.status(400).json({
          success: false,
          message: 'Phone number already exists',
        });
      }
    }

    // Update student if changed
    if (studentId && studentId !== user.studentId.toString()) {
      const student = await Student.findById(studentId);
      if (!student) {
        return res.status(404).json({
          success: false,
          message: 'Student not found',
        });
      }
    }

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        name,
        email,
        phone,
        background,
        studentId,
        role,
      },
      { new: true }
    ).populate({
      path: 'studentId',
      select: 'firstName middleName lastName phone email gender motherName block dorm university college department batch region zone wereda kebele church authority job motherTongue additionalLanguages dateOfBirth emergencyContact attendsCourse courseName courseChurch isActive createdAt updatedAt photo photoData gibyGubayeId'
    });

    res.json({
      success: true,
      data: updatedUser,
      message: 'User updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating user:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Change user password
export const changePassword = async (req: Request, res: Response) => {
  try {
    const { userId, newPassword } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashedPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error: any) {
    console.error('Error changing password:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Delete user
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const user = await User.findByIdAndDelete(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get user statistics - UPDATED
export const getUserStatistics = async (req: Request, res: Response) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const blockedUsers = await User.countDocuments({ isActive: false });

    // Count by role
    const roles = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
    ]);

    // Get recent users with student data
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate({
        path: 'studentId',
        select: 'firstName lastName photo photoData gibyGubayeId'
      });

    res.json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        blockedUsers,
        roles,
        recentUsers
      },
    });
  } catch (error: any) {
    console.error('Error getting user statistics:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};