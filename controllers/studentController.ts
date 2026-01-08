import { Request, Response } from 'express';
import Student, { IStudent } from '../models/Student';
import { generateStudentId } from '../utils/generateStudentId';
import mongoose from 'mongoose';

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

// Get all students with pagination and filtering - INCLUDES PHOTODATA
export const getAllStudents = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string || '';
    const university = req.query.university as string || '';
    const college = req.query.college as string || '';
    const department = req.query.department as string || '';
    const batch = req.query.batch as string || '';
    const gender = req.query.gender as string || '';
    const status = req.query.status as string || '';

    const skip = (page - 1) * limit;

    // Build filter object
    const filter: any = {};
    
    if (search) {
      filter.$or = [
        { gibyGubayeId: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { motherName: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (university) {
      filter.university = university;
    }
    
    if (college) {
      filter.college = college;
    }
    
    if (department) {
      filter.department = department;
    }
    
    if (batch) {
      filter.batch = batch;
    }
    
    if (gender) {
      filter.gender = gender;
    }
    
    if (status) {
      filter.isActive = status === 'active';
    }

    // CHANGED: Include photoData for admin panel
    const students = await Student.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalStudents = await Student.countDocuments(filter);
    const totalPages = Math.ceil(totalStudents / limit);

    successResponse(res, {
      students,
      pagination: {
        currentPage: page,
        totalPages,
        totalStudents,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    }, 'Students retrieved successfully');
  } catch (error: any) {
    console.error('Error fetching students:', error);
    errorResponse(res, error.message, 500);
  }
};

// Get single student - INCLUDES PHOTODATA
export const getStudent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return errorResponse(res, 'Student identifier is required', 400);
    }

    let student = null;

    // Check if the ID is a valid MongoDB ObjectId
    if (mongoose.Types.ObjectId.isValid(id)) {
      // CHANGED: Include photoData for single student view
      student = await Student.findById(id);
    }
    
    // If not found by _id, try by gibyGubayeId
    if (!student) {
      // CHANGED: Include photoData for single student view
      student = await Student.findOne({ 
        gibyGubayeId: id
      });
    }

    if (!student) {
      return errorResponse(res, 'Student not found', 404);
    }

    successResponse(res, student, 'Student retrieved successfully');
  } catch (error: any) {
    console.error('Error fetching student:', error);
    errorResponse(res, error.message, 500);
  }
};

// Create new student - INCLUDES PHOTODATA in response
export const createStudent = async (req: Request, res: Response) => {
  try {
    const {
      firstName,
      middleName,
      lastName,
      motherName,
      phone,
      email,
      gender,
      block,
      dorm,
      university,
      college,
      department,
      batch,
      region,
      zone,
      wereda,
      kebele,
      church,
      authority,
      job,
      motherTongue,
      additionalLanguages,
      attendsCourse,
      courseName,
      courseChurch,
      dateOfBirth,
      emergencyContact
    } = req.body;

    // Check if student already exists
    const existingPhone = await Student.findOne({ phone });
    if (existingPhone) {
      return errorResponse(res, 'Student with this phone number already exists', 400);
    }

    const existingEmail = await Student.findOne({ email });
    if (existingEmail) {
      return errorResponse(res, 'Student with this email already exists', 400);
    }

    // Generate student ID
    const gibyGubayeId = await generateStudentId(batch);

    // Handle photo upload
    let photo = '';
    let photoData = undefined;
    
    if (req.file) {
      // Store actual data in photoData field
      photoData = {
        data: req.file.buffer,
        contentType: req.file.mimetype,
        fileName: req.file.originalname
      };
      
      // Keep the old URL format for frontend compatibility
      photo = `/uploads/students/${Date.now()}-${Math.random().toString(36).substring(2)}-${req.file.originalname}`;
    }

    // Parse additionalLanguages if it's a string
    let additionalLanguagesArray: string[] = [];
    if (additionalLanguages) {
      if (typeof additionalLanguages === 'string') {
        additionalLanguagesArray = additionalLanguages.split(',').map(lang => lang.trim());
      } else if (Array.isArray(additionalLanguages)) {
        additionalLanguagesArray = additionalLanguages;
      }
    }

    const newStudent = new Student({
      gibyGubayeId,
      firstName,
      middleName,
      lastName,
      motherName,
      phone,
      email,
      gender,
      block,
      dorm,
      university,
      college,
      department,
      batch,
      region,
      zone,
      wereda,
      kebele,
      church,
      authority,
      job,
      motherTongue,
      additionalLanguages: additionalLanguagesArray,
      attendsCourse: attendsCourse === 'true' || attendsCourse === true,
      courseName: attendsCourse === 'true' || attendsCourse === true ? courseName : undefined,
      courseChurch: attendsCourse === 'true' || attendsCourse === true ? courseChurch : undefined,
      numberOfJob: 0,
      dateOfBirth: new Date(dateOfBirth),
      emergencyContact,
      photo, // Keep for frontend
      photoData, // Store actual data
      isActive: true
    });

    await newStudent.save();
    
    // CHANGED: Return with photoData for immediate display
    successResponse(res, newStudent, 'Student created successfully');
  } catch (error: any) {
    console.error('Error creating student:', error);
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return errorResponse(res, `Student with this ${field} already exists`, 400);
    }
    errorResponse(res, error.message, 500);
  }
};

// Update student - INCLUDES PHOTODATA in response
export const updateStudent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse(res, 'Invalid student ID', 400);
    }

    const student = await Student.findById(id);
    if (!student) {
      return errorResponse(res, 'Student not found', 404);
    }

    // Check for duplicate phone/email if changed
    const { phone, email } = req.body;
    
    if (phone && phone !== student.phone) {
      const existingPhone = await Student.findOne({ phone, _id: { $ne: id } });
      if (existingPhone) {
        return errorResponse(res, 'Another student with this phone number already exists', 400);
      }
    }
    
    if (email && email !== student.email) {
      const existingEmail = await Student.findOne({ email, _id: { $ne: id } });
      if (existingEmail) {
        return errorResponse(res, 'Another student with this email already exists', 400);
      }
    }

    // Handle photo upload
    if (req.file) {
      // Store actual data
      req.body.photoData = {
        data: req.file.buffer,
        contentType: req.file.mimetype,
        fileName: req.file.originalname
      };
      
      // Keep old URL format
      req.body.photo = `/uploads/students/${Date.now()}-${Math.random().toString(36).substring(2)}-${req.file.originalname}`;
    }

    // Update date of birth if provided
    if (req.body.dateOfBirth) {
      req.body.dateOfBirth = new Date(req.body.dateOfBirth);
    }

    // Handle additionalLanguages
    if (req.body.additionalLanguages) {
      if (typeof req.body.additionalLanguages === 'string') {
        req.body.additionalLanguages = req.body.additionalLanguages.split(',').map((lang: string) => lang.trim());
      }
    }

    // Handle attendsCourse
    if (req.body.attendsCourse !== undefined) {
      req.body.attendsCourse = req.body.attendsCourse === 'true' || req.body.attendsCourse === true;
    }

    // CHANGED: Include photoData in response
    const updatedStudent = await Student.findByIdAndUpdate(
      id,
      { ...req.body },
      { new: true, runValidators: true }
    );

    successResponse(res, updatedStudent, 'Student updated successfully');
  } catch (error: any) {
    console.error('Error updating student:', error);
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return errorResponse(res, `Student with this ${field} already exists`, 400);
    }
    errorResponse(res, error.message, 500);
  }
};

// Serve student photo (handles old URL format)
export const serveStudentPhoto = async (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    
    // Find student by photo URL (exact match)
    const student = await Student.findOne({ photo: `/uploads/students/${filename}` });
    
    if (!student || !student.photoData || !student.photoData.data) {
      return res.status(404).json({ 
        success: false, 
        message: 'Photo not found' 
      });
    }

    // Set proper headers and send the image
    res.set('Content-Type', student.photoData.contentType);
    res.set('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    res.send(student.photoData.data);
  } catch (error: any) {
    console.error('Error serving student photo:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

// Get student photo by ID
export const getStudentPhotoById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const student = await Student.findById(id);
    
    if (!student || !student.photoData || !student.photoData.data) {
      return res.status(404).json({ 
        success: false, 
        message: 'Photo not found' 
      });
    }

    res.set('Content-Type', student.photoData.contentType);
    res.set('Cache-Control', 'public, max-age=31536000');
    res.send(student.photoData.data);
  } catch (error: any) {
    console.error('Error fetching student photo:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

// Update student status - INCLUDES PHOTODATA
export const updateStudentStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return errorResponse(res, 'isActive must be a boolean value', 400);
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse(res, 'Invalid student ID', 400);
    }

    // CHANGED: Include photoData in response
    const student = await Student.findByIdAndUpdate(
      id,
      { isActive },
      { new: true, runValidators: true }
    );

    if (!student) {
      return errorResponse(res, 'Student not found', 404);
    }

    successResponse(res, student, `Student ${isActive ? 'activated' : 'deactivated'} successfully`);
  } catch (error: any) {
    errorResponse(res, error.message, 500);
  }
};

// Delete student
export const deleteStudent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse(res, 'Invalid student ID', 400);
    }

    const student = await Student.findById(id);
    if (!student) {
      return errorResponse(res, 'Student not found', 404);
    }

    await Student.findByIdAndDelete(id);

    successResponse(res, null, 'Student deleted successfully');
  } catch (error: any) {
    errorResponse(res, error.message, 500);
  }
};

// Get student statistics - MODIFIED to include photoData in some queries
export const getStudentStatistics = async (req: Request, res: Response) => {
  try {
    const totalStudents = await Student.countDocuments();
    const activeStudents = await Student.countDocuments({ isActive: true });
    const inactiveStudents = await Student.countDocuments({ isActive: false });
    
    // Group by university
    const universityStats = await Student.aggregate([
      {
        $group: {
          _id: '$university',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Group by college
    const collegeStats = await Student.aggregate([
      {
        $group: {
          _id: '$college',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Group by department
    const departmentStats = await Student.aggregate([
      {
        $group: {
          _id: '$department',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Group by batch
    const batchStats = await Student.aggregate([
      {
        $group: {
          _id: '$batch',
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: -1 } }
    ]);

    // Group by gender
    const genderStats = await Student.aggregate([
      {
        $group: {
          _id: '$gender',
          count: { $sum: 1 }
        }
      }
    ]);

    // Group by region
    const regionStats = await Student.aggregate([
      {
        $group: {
          _id: '$region',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Recent students - INCLUDES PHOTODATA for admin panel
    const recentStudents = await Student.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('firstName lastName gibyGubayeId photo photoData createdAt isActive');

    successResponse(res, {
      totalStudents,
      activeStudents,
      inactiveStudents,
      universityStats,
      collegeStats,
      departmentStats,
      batchStats,
      genderStats,
      regionStats,
      recentStudents
    }, 'Statistics retrieved successfully');
  } catch (error: any) {
    errorResponse(res, error.message, 500);
  }
};

// Get unique values for filters
export const getFilterOptions = async (req: Request, res: Response) => {
  try {
    const universities = await Student.distinct('university');
    const colleges = await Student.distinct('college');
    const departments = await Student.distinct('department');
    const batches = await Student.distinct('batch');
    const regions = await Student.distinct('region');

    successResponse(res, {
      universities: universities.filter(Boolean).sort(),
      colleges: colleges.filter(Boolean).sort(),
      departments: departments.filter(Boolean).sort(),
      batches: batches.filter(Boolean).sort(),
      regions: regions.filter(Boolean).sort()
    }, 'Filter options retrieved successfully');
  } catch (error: any) {
    errorResponse(res, error.message, 500);
  }
};