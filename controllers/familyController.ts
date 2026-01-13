import { Request, Response } from 'express';
import Family, { IFamily, IGrandParent, IFamilyMember, IFamilyChild } from '../models/Family';
import User from '../models/User';
import Student from '../models/Student';
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

// Get all families with pagination and filtering
export const getAllFamilies = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string || '';
    const status = req.query.status as string || '';
    const location = req.query.location as string || '';
    const batch = req.query.batch as string || '';
    const createdBy = req.query.createdBy as string || '';
    const fromDate = req.query.fromDate as string || '';
    const toDate = req.query.toDate as string || '';
    const sortBy = req.query.sortBy as string || 'familyDate';
    const sortOrder = req.query.sortOrder as string === 'asc' ? 1 : -1;

    const skip = (page - 1) * limit;

    // Build filter object
    const filter: any = {};
    
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
        { 'grandParents.title': { $regex: search, $options: 'i' } },
        { 'leader.firstName': { $regex: search, $options: 'i' } },
        { 'leader.lastName': { $regex: search, $options: 'i' } },
        { 'coLeader.firstName': { $regex: search, $options: 'i' } },
        { 'coLeader.lastName': { $regex: search, $options: 'i' } },
        { 'secretary.firstName': { $regex: search, $options: 'i' } },
        { 'secretary.lastName': { $regex: search, $options: 'i' } }
      ];
    }
    
    if (status) {
      filter.status = status;
    }
    
    if (location) {
      filter.location = { $regex: location, $options: 'i' };
    }
    
    if (batch) {
      filter.batch = batch;
    }
    
    if (createdBy && mongoose.Types.ObjectId.isValid(createdBy)) {
      filter.createdBy = createdBy;
    }

    // Date range filtration
    if (fromDate || toDate) {
      filter.familyDate = {};
      
      if (fromDate) {
        const from = new Date(fromDate);
        from.setHours(0, 0, 0, 0);
        filter.familyDate.$gte = from;
      }
      
      if (toDate) {
        const to = new Date(toDate);
        to.setHours(23, 59, 59, 999);
        filter.familyDate.$lte = to;
      }
    }

    // Sort object
    const sort: any = {};
    sort[sortBy] = sortOrder;

    const families = await Family.find(filter)
      .populate('leader') // Populate virtual field
      .populate('coLeader') // Populate virtual field
      .populate('secretary') // Populate virtual field
      .populate('creator') // Populate virtual field for createdBy
      .populate({
        path: 'grandParents.grandFather grandParents.grandMother',
        select: 'firstName middleName lastName gender gibyGubayeId phone email batch photo photoData motherName university college department region job dateOfBirth emergencyContact'
      })
      .populate({
        path: 'grandParents.families.father.student grandParents.families.mother.student',
        select: 'firstName middleName lastName gender gibyGubayeId phone email batch photo photoData motherName university college department region job dateOfBirth emergencyContact'
      })
      .populate({
        path: 'grandParents.families.children.student',
        select: 'firstName middleName lastName gender gibyGubayeId phone email batch photo photoData motherName university college department region job dateOfBirth emergencyContact'
      })
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const totalFamilies = await Family.countDocuments(filter);
    const totalPages = Math.ceil(totalFamilies / limit);

    successResponse(res, {
      families,
      pagination: {
        currentPage: page,
        totalPages,
        totalFamilies,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    }, 'Families retrieved successfully');
  } catch (error: any) {
    console.error('Error fetching families:', error);
    errorResponse(res, error.message, 500);
  }
};

// Get single family by ID
export const getFamily = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse(res, 'Invalid family ID', 400);
    }

    const family = await Family.findById(id)
      .populate('leader') // Populate virtual field
      .populate('coLeader') // Populate virtual field
      .populate('secretary') // Populate virtual field
      .populate('creator') // Populate virtual field for createdBy
      .populate({
        path: 'grandParents.grandFather grandParents.grandMother',
        select: 'firstName middleName lastName gender gibyGubayeId phone email batch photo photoData motherName university college department region job dateOfBirth emergencyContact'
      })
      .populate({
        path: 'grandParents.families.father.student grandParents.families.mother.student',
        select: 'firstName middleName lastName gender gibyGubayeId phone email batch photo photoData motherName university college department region job dateOfBirth emergencyContact'
      })
      .populate({
        path: 'grandParents.families.children.student',
        select: 'firstName middleName lastName gender gibyGubayeId phone email batch photo photoData motherName university college department region job dateOfBirth emergencyContact'
      });

    if (!family) {
      return errorResponse(res, 'Family not found', 404);
    }

    successResponse(res, family, 'Family retrieved successfully');
  } catch (error: any) {
    console.error('Error fetching family:', error);
    errorResponse(res, error.message, 500);
  }
};

// Get filter options for families
export const getFamilyFilterOptions = async (req: Request, res: Response) => {
  try {
    // Get unique batches
    const batches = await Student.distinct('batch');
    const filteredBatches = batches.filter((batch): batch is string => 
      batch !== null && batch !== undefined && batch !== ''
    );

    // Get all students for selection
    const allStudents = await Student.find({}, '_id firstName middleName lastName gender gibyGubayeId phone email batch photo photoData motherName university college department region job dateOfBirth emergencyContact')
      .sort({ firstName: 1 });

    // Get unique locations
    const locations = await Family.distinct('location');
    const filteredLocations = locations.filter((location): location is string => 
      location !== null && location !== undefined && location !== ''
    );

    successResponse(res, {
      batches: filteredBatches.sort(),
      allStudents,
      locations: filteredLocations.sort()
    }, 'Filter options retrieved successfully');
  } catch (error: any) {
    console.error('Error fetching filter options:', error);
    errorResponse(res, error.message, 500);
  }
};

// Helper function to check for duplicate students within a family
const checkForDuplicateStudents = (familyData: any): { valid: boolean; message?: string } => {
  try {
    const studentIds = new Set<string>();
    
    // Check leaders - they must be unique within this family
    const leaders = [
      familyData.familyLeader.toString(),
      familyData.familyCoLeader.toString(),
      familyData.familySecretary.toString()
    ];
    
    // Check for duplicates within leaders
    const leaderSet = new Set(leaders);
    if (leaderSet.size !== 3) {
      return { valid: false, message: 'Leaders must be different students' };
    }
    
    // Add leaders to used IDs
    leaders.forEach(id => studentIds.add(id));
    
    // Check grand parents
    for (const grandParent of familyData.grandParents) {
      if (grandParent.grandFather) {
        const id = grandParent.grandFather.toString();
        if (studentIds.has(id)) {
          return { valid: false, message: `Duplicate student found in grand father: ${id}` };
        }
        studentIds.add(id);
      }
      
      if (grandParent.grandMother) {
        const id = grandParent.grandMother.toString();
        if (studentIds.has(id)) {
          return { valid: false, message: `Duplicate student found in grand mother: ${id}` };
        }
        studentIds.add(id);
      }
      
      // Check families
      for (const familyMember of grandParent.families) {
        // Father
        const fatherId = familyMember.father.student.toString();
        if (studentIds.has(fatherId)) {
          return { valid: false, message: `Duplicate student found in father: ${fatherId}` };
        }
        studentIds.add(fatherId);
        
        // Mother
        const motherId = familyMember.mother.student.toString();
        if (studentIds.has(motherId)) {
          return { valid: false, message: `Duplicate student found in mother: ${motherId}` };
        }
        studentIds.add(motherId);
        
        // Check father and mother are different
        if (fatherId === motherId) {
          return { valid: false, message: 'Father and mother must be different students' };
        }
        
        // Children
        for (const child of familyMember.children) {
          const childId = child.student.toString();
          if (studentIds.has(childId)) {
            return { valid: false, message: `Duplicate student found in children: ${childId}` };
          }
          studentIds.add(childId);
        }
      }
    }
    
    return { valid: true };
  } catch (error: any) {
    return { valid: false, message: error.message };
  }
};

// Validate gender for family members
const validateGenderForFamilyMembers = async (familyData: any): Promise<{ valid: boolean; message?: string }> => {
  try {
    // Get all student IDs
    const allStudentIds: string[] = [];
    allStudentIds.push(
      familyData.familyLeader.toString(),
      familyData.familyCoLeader.toString(),
      familyData.familySecretary.toString()
    );
    
    for (const grandParent of familyData.grandParents) {
      if (grandParent.grandFather) allStudentIds.push(grandParent.grandFather.toString());
      if (grandParent.grandMother) allStudentIds.push(grandParent.grandMother.toString());
      
      for (const familyMember of grandParent.families) {
        allStudentIds.push(familyMember.father.student.toString());
        allStudentIds.push(familyMember.mother.student.toString());
        
        for (const child of familyMember.children) {
          allStudentIds.push(child.student.toString());
        }
      }
    }
    
    // Fetch all students
    const students = await Student.find({ 
      _id: { $in: allStudentIds } 
    }, '_id gender batch firstName lastName');
    
    // Create a map for quick lookup
    const studentMap = new Map();
    students.forEach(student => {
      studentMap.set(student._id.toString(), {
        gender: student.gender,
        batch: student.batch,
        firstName: student.firstName,
        lastName: student.lastName
      });
    });
    
    // Validate gender for parents
    for (const grandParent of familyData.grandParents) {
      for (const familyMember of grandParent.families) {
        // Check father is male
        const father = studentMap.get(familyMember.father.student.toString());
        if (father && father.gender !== 'male') {
          return { 
            valid: false, 
            message: `Father ${father.firstName} ${father.lastName} must be male, but student is ${father.gender}` 
          };
        }
        
        // Check mother is female
        const mother = studentMap.get(familyMember.mother.student.toString());
        if (mother && mother.gender !== 'female') {
          return { 
            valid: false, 
            message: `Mother ${mother.firstName} ${mother.lastName} must be female, but student is ${mother.gender}` 
          };
        }
      }
    }
    
    return { valid: true };
  } catch (error: any) {
    return { valid: false, message: error.message };
  }
};

// Validate children batch matches family batch if allowOtherBatches is false
const validateChildrenBatch = async (familyData: any, allowOtherBatches: boolean): Promise<{ valid: boolean; message?: string }> => {
  try {
    if (allowOtherBatches) {
      return { valid: true };
    }
    
    const familyBatch = familyData.batch;
    const allChildrenIds: string[] = [];
    
    for (const grandParent of familyData.grandParents) {
      for (const familyMember of grandParent.families) {
        for (const child of familyMember.children) {
          allChildrenIds.push(child.student);
        }
      }
    }
    
    if (allChildrenIds.length === 0) {
      return { valid: true };
    }
    
    // Fetch children students
    const children = await Student.find({ 
      _id: { $in: allChildrenIds } 
    }, '_id batch firstName lastName');
    
    // Check batch
    for (const child of children) {
      if (child.batch !== familyBatch) {
        return { 
          valid: false, 
          message: `Child ${child.firstName} ${child.lastName} is from batch ${child.batch}, but family batch is ${familyBatch}. Please enable "Allow other batches" or select children from batch ${familyBatch}.` 
        };
      }
    }
    
    return { valid: true };
  } catch (error: any) {
    return { valid: false, message: error.message };
  }
};

// Create new family
export const createFamily = async (req: Request, res: Response) => {
  try {
    const {
      title,
      location,
      batch,
      allowOtherBatches = false,
      familyDate,
      familyLeader,
      familyCoLeader,
      familySecretary,
      grandParents = [],
      status = 'current'
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

    // Validate required fields
    if (!title || !location || !batch || !familyLeader || !familyCoLeader || !familySecretary) {
      return errorResponse(res, 'Missing required fields: title, location, batch, familyLeader, familyCoLeader, familySecretary', 400);
    }

    // Parse and validate grand parents
    let grandParentsArray: IGrandParent[] = [];
    if (grandParents && Array.isArray(grandParents)) {
      for (const gp of grandParents) {
        if (!gp.title) {
          return errorResponse(res, 'Grand parent title is required', 400);
        }
        
        if (!gp.grandFather && !gp.grandMother) {
          return errorResponse(res, 'At least one of grandFather or grandMother is required', 400);
        }
        
        // Validate families
        const families: IFamilyMember[] = [];
        if (gp.families && Array.isArray(gp.families)) {
          for (const family of gp.families) {
            if (!family.father || !family.father.student) {
              return errorResponse(res, 'Father student is required', 400);
            }
            if (!family.mother || !family.mother.student) {
              return errorResponse(res, 'Mother student is required', 400);
            }
            
            // Validate children
            const children: IFamilyChild[] = [];
            if (family.children && Array.isArray(family.children)) {
              for (const child of family.children) {
                if (!child.student) {
                  return errorResponse(res, 'Child student is required', 400);
                }
                children.push({
                  student: new mongoose.Types.ObjectId(child.student),
                  relationship: child.relationship || 'son',
                  birthOrder: child.birthOrder,
                  addedAt: new Date()
                });
              }
            }
            
            families.push({
              father: {
                student: new mongoose.Types.ObjectId(family.father.student),
                phone: family.father.phone,
                email: family.father.email,
                occupation: family.father.occupation
              },
              mother: {
                student: new mongoose.Types.ObjectId(family.mother.student),
                phone: family.mother.phone,
                email: family.mother.email,
                occupation: family.mother.occupation
              },
              children,
              createdAt: new Date()
            });
          }
        }
        
        grandParentsArray.push({
          title: gp.title.trim(),
          grandFather: gp.grandFather ? new mongoose.Types.ObjectId(gp.grandFather) : undefined,
          grandMother: gp.grandMother ? new mongoose.Types.ObjectId(gp.grandMother) : undefined,
          families
        });
      }
    }

    // Create family data object for validation
    const familyData = {
      title: title.trim(),
      location: location.trim(),
      batch,
      familyLeader: new mongoose.Types.ObjectId(familyLeader),
      familyCoLeader: new mongoose.Types.ObjectId(familyCoLeader),
      familySecretary: new mongoose.Types.ObjectId(familySecretary),
      grandParents: grandParentsArray
    };

    // Check for duplicate students within this family
    const duplicateCheck = checkForDuplicateStudents(familyData);
    if (!duplicateCheck.valid) {
      return errorResponse(res, duplicateCheck.message || 'Duplicate students found within family', 400);
    }

    // Validate gender
    const genderValidation = await validateGenderForFamilyMembers(familyData);
    if (!genderValidation.valid) {
      return errorResponse(res, genderValidation.message || 'Gender validation failed', 400);
    }

    // Validate children batch
    const batchValidation = await validateChildrenBatch(familyData, allowOtherBatches);
    if (!batchValidation.valid) {
      return errorResponse(res, batchValidation.message || 'Batch validation failed', 400);
    }

    // Check if all student IDs exist
    const allStudentIds: string[] = [];
    allStudentIds.push(familyLeader, familyCoLeader, familySecretary);
    
    for (const gp of grandParentsArray) {
      if (gp.grandFather) allStudentIds.push(gp.grandFather.toString());
      if (gp.grandMother) allStudentIds.push(gp.grandMother.toString());
      
      for (const family of gp.families) {
        allStudentIds.push(family.father.student.toString());
        allStudentIds.push(family.mother.student.toString());
        
        for (const child of family.children) {
          allStudentIds.push(child.student.toString());
        }
      }
    }

    const existingStudents = await Student.find({ _id: { $in: allStudentIds } });
    if (existingStudents.length !== allStudentIds.length) {
      return errorResponse(res, 'One or more students not found', 400);
    }

    const newFamily = new Family({
      ...familyData,
      allowOtherBatches,
      familyDate: familyDate ? new Date(familyDate) : new Date(),
      status,
      createdBy
    });

    await newFamily.save();
    
    // Populate references with all student details using virtual fields
    const populatedFamily = await Family.findById(newFamily._id)
      .populate('leader') // Populate virtual field
      .populate('coLeader') // Populate virtual field
      .populate('secretary') // Populate virtual field
      .populate('creator') // Populate virtual field
      .populate({
        path: 'grandParents.grandFather grandParents.grandMother',
        select: 'firstName middleName lastName gender gibyGubayeId phone email batch photo photoData motherName university college department region job dateOfBirth emergencyContact'
      })
      .populate({
        path: 'grandParents.families.father.student grandParents.families.mother.student',
        select: 'firstName middleName lastName gender gibyGubayeId phone email batch photo photoData motherName university college department region job dateOfBirth emergencyContact'
      })
      .populate({
        path: 'grandParents.families.children.student',
        select: 'firstName middleName lastName gender gibyGubayeId phone email batch photo photoData motherName university college department region job dateOfBirth emergencyContact'
      });

    successResponse(res, populatedFamily, 'Family created successfully');
  } catch (error: any) {
    console.error('Error creating family:', error);
    if (error.code === 11000) {
      return errorResponse(res, 'Family title already exists', 400);
    }
    errorResponse(res, error.message, 500);
  }
};

// Update family
export const updateFamily = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse(res, 'Invalid family ID', 400);
    }

    const existingFamily = await Family.findById(id);
    if (!existingFamily) {
      return errorResponse(res, 'Family not found', 404);
    }

    // Check if user has permission
    const userId = (req as any).user?._id;
    const userRole = (req as any).user?.role;
    
    if (existingFamily.createdBy.toString() !== userId.toString() && userRole !== 'admin' && userRole !== 'moderator') {
      return errorResponse(res, 'Not authorized to update this family', 403);
    }

    const {
      title,
      location,
      batch,
      allowOtherBatches,
      familyDate,
      familyLeader,
      familyCoLeader,
      familySecretary,
      grandParents,
      status
    } = req.body;

    // Prepare update data
    const updateData: any = {};
    if (title !== undefined) updateData.title = title.trim();
    if (location !== undefined) updateData.location = location.trim();
    if (batch !== undefined) updateData.batch = batch;
    if (allowOtherBatches !== undefined) updateData.allowOtherBatches = allowOtherBatches;
    if (familyDate) updateData.familyDate = new Date(familyDate);
    if (familyLeader) updateData.familyLeader = new mongoose.Types.ObjectId(familyLeader);
    if (familyCoLeader) updateData.familyCoLeader = new mongoose.Types.ObjectId(familyCoLeader);
    if (familySecretary) updateData.familySecretary = new mongoose.Types.ObjectId(familySecretary);
    if (status) updateData.status = status;

    // Parse grand parents if being updated
    if (grandParents && Array.isArray(grandParents)) {
      const grandParentsArray: IGrandParent[] = [];
      
      for (const gp of grandParents) {
        if (!gp.title) {
          return errorResponse(res, 'Grand parent title is required', 400);
        }
        
        if (!gp.grandFather && !gp.grandMother) {
          return errorResponse(res, 'At least one of grandFather or grandMother is required', 400);
        }
        
        const families: IFamilyMember[] = [];
        if (gp.families && Array.isArray(gp.families)) {
          for (const family of gp.families) {
            if (!family.father || !family.father.student) {
              return errorResponse(res, 'Father student is required', 400);
            }
            if (!family.mother || !family.mother.student) {
              return errorResponse(res, 'Mother student is required', 400);
            }
            
            const children: IFamilyChild[] = [];
            if (family.children && Array.isArray(family.children)) {
              for (const child of family.children) {
                if (!child.student) {
                  return errorResponse(res, 'Child student is required', 400);
                }
                children.push({
                  student: new mongoose.Types.ObjectId(child.student),
                  relationship: child.relationship || 'son',
                  birthOrder: child.birthOrder,
                  addedAt: child.addedAt || new Date()
                });
              }
            }
            
            families.push({
              father: {
                student: new mongoose.Types.ObjectId(family.father.student),
                phone: family.father.phone,
                email: family.father.email,
                occupation: family.father.occupation
              },
              mother: {
                student: new mongoose.Types.ObjectId(family.mother.student),
                phone: family.mother.phone,
                email: family.mother.email,
                occupation: family.mother.occupation
              },
              children,
              createdAt: family.createdAt ? new Date(family.createdAt) : new Date()
            });
          }
        }
        
        grandParentsArray.push({
          title: gp.title.trim(),
          grandFather: gp.grandFather ? new mongoose.Types.ObjectId(gp.grandFather) : undefined,
          grandMother: gp.grandMother ? new mongoose.Types.ObjectId(gp.grandMother) : undefined,
          families
        });
      }
      
      updateData.grandParents = grandParentsArray;
    }

    // Create family data object for validation
    const familyDataForValidation = {
      title: updateData.title || existingFamily.title,
      location: updateData.location || existingFamily.location,
      batch: updateData.batch || existingFamily.batch,
      familyLeader: updateData.familyLeader || existingFamily.familyLeader,
      familyCoLeader: updateData.familyCoLeader || existingFamily.familyCoLeader,
      familySecretary: updateData.familySecretary || existingFamily.familySecretary,
      grandParents: updateData.grandParents || existingFamily.grandParents
    };

    // Check for duplicate students within this family
    const duplicateCheck = checkForDuplicateStudents(familyDataForValidation);
    if (!duplicateCheck.valid) {
      return errorResponse(res, duplicateCheck.message || 'Duplicate students found within family', 400);
    }

    // Validate gender
    const genderValidation = await validateGenderForFamilyMembers(familyDataForValidation);
    if (!genderValidation.valid) {
      return errorResponse(res, genderValidation.message || 'Gender validation failed', 400);
    }

    // Validate children batch
    const batchValidation = await validateChildrenBatch(
      familyDataForValidation, 
      updateData.allowOtherBatches !== undefined ? updateData.allowOtherBatches : existingFamily.allowOtherBatches
    );
    if (!batchValidation.valid) {
      return errorResponse(res, batchValidation.message || 'Batch validation failed', 400);
    }

    // Check if all student IDs exist
    const allStudentIds: string[] = [];
    allStudentIds.push(
      familyDataForValidation.familyLeader.toString(),
      familyDataForValidation.familyCoLeader.toString(),
      familyDataForValidation.familySecretary.toString()
    );
    
    for (const gp of familyDataForValidation.grandParents) {
      if (gp.grandFather) allStudentIds.push(gp.grandFather.toString());
      if (gp.grandMother) allStudentIds.push(gp.grandMother.toString());
      
      for (const family of gp.families) {
        allStudentIds.push(family.father.student.toString());
        allStudentIds.push(family.mother.student.toString());
        
        for (const child of family.children) {
          allStudentIds.push(child.student.toString());
        }
      }
    }

    const existingStudents = await Student.find({ _id: { $in: allStudentIds } });
    if (existingStudents.length !== allStudentIds.length) {
      return errorResponse(res, 'One or more students not found', 400);
    }

    const updatedFamily = await Family.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    )
    .populate('leader') // Populate virtual field
    .populate('coLeader') // Populate virtual field
    .populate('secretary') // Populate virtual field
    .populate('creator') // Populate virtual field
    .populate({
      path: 'grandParents.grandFather grandParents.grandMother',
      select: 'firstName middleName lastName gender gibyGubayeId phone email batch photo photoData motherName university college department region job dateOfBirth emergencyContact'
    })
    .populate({
      path: 'grandParents.families.father.student grandParents.families.mother.student',
      select: 'firstName middleName lastName gender gibyGubayeId phone email batch photo photoData motherName university college department region job dateOfBirth emergencyContact'
    })
    .populate({
      path: 'grandParents.families.children.student',
      select: 'firstName middleName lastName gender gibyGubayeId phone email batch photo photoData motherName university college department region job dateOfBirth emergencyContact'
    });

    successResponse(res, updatedFamily, 'Family updated successfully');
  } catch (error: any) {
    console.error('Error updating family:', error);
    errorResponse(res, error.message, 500);
  }
};

// Get students with search - ENHANCED for frontend filtering
export const getStudentsForFamilySelection = async (req: Request, res: Response) => {
  try {
    const { batch, gender, excludeFamily, search, role, page = 1, limit = 50, excludeIds } = req.query;
    
    const filter: any = {};
    
    // Filter by gender if specified
    if (gender) {
      filter.gender = gender;
    }
    
    // Search across multiple fields
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { gibyGubayeId: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { motherName: { $regex: search, $options: 'i' } },
        { university: { $regex: search, $options: 'i' } },
        { college: { $regex: search, $options: 'i' } },
        { department: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Handle excludeIds parameter from frontend (for real-time filtering)
    if (excludeIds && typeof excludeIds === 'string') {
      const idsToExclude = excludeIds.split(',').filter(id => mongoose.Types.ObjectId.isValid(id));
      if (idsToExclude.length > 0) {
        filter._id = { $nin: idsToExclude };
      }
    }
    
    // If excludeFamily is provided, exclude students already in that family
    if (excludeFamily && mongoose.Types.ObjectId.isValid(excludeFamily as string)) {
      const family = await Family.findById(excludeFamily)
        .select('familyLeader familyCoLeader familySecretary grandParents')
        .lean();
      
      if (family) {
        const excludedIds = new Set<string>();
        
        // Add leaders
        excludedIds.add(family.familyLeader.toString());
        excludedIds.add(family.familyCoLeader.toString());
        excludedIds.add(family.familySecretary.toString());
        
        // Add grand parents
        if (family.grandParents && Array.isArray(family.grandParents)) {
          for (const gp of family.grandParents) {
            if (gp.grandFather) excludedIds.add(gp.grandFather.toString());
            if (gp.grandMother) excludedIds.add(gp.grandMother.toString());
            
            if (gp.families && Array.isArray(gp.families)) {
              for (const fam of gp.families) {
                if (fam.father?.student) excludedIds.add(fam.father.student.toString());
                if (fam.mother?.student) excludedIds.add(fam.mother.student.toString());
                
                if (fam.children && Array.isArray(fam.children)) {
                  for (const child of fam.children) {
                    if (child.student) excludedIds.add(child.student.toString());
                  }
                }
              }
            }
          }
        }
        
        // Merge with existing filter
        if (filter._id) {
          // Combine both exclusion lists
          const existingExclusions = Array.isArray(filter._id.$nin) ? filter._id.$nin : [];
          const combinedExclusions = [...existingExclusions, ...Array.from(excludedIds)];
          // Remove duplicates
          const uniqueExclusions = [...new Set(combinedExclusions)];
          filter._id = { $nin: uniqueExclusions };
        } else {
          filter._id = { $nin: Array.from(excludedIds) };
        }
      }
    }
    
    // Pagination
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;
    
    // For child role, filter by batch if provided (unless allowOtherBatches is true)
    if (role === 'child' && batch) {
      filter.batch = batch;
    }
    
    // For father/mother roles, filter by gender automatically
    if (role === 'father') {
      filter.gender = 'male';
    } else if (role === 'mother') {
      filter.gender = 'female';
    }
    
    // For grand father/mother roles, filter by gender
    if (role === 'grandFather') {
      filter.gender = 'male';
    } else if (role === 'grandMother') {
      filter.gender = 'female';
    }
    
    const students = await Student.find(filter, '_id firstName middleName lastName gender gibyGubayeId phone email batch photo photoData motherName university college department region job dateOfBirth emergencyContact')
      .sort({ firstName: 1, lastName: 1 })
      .skip(skip)
      .limit(limitNum);
    
    const totalStudents = await Student.countDocuments(filter);
    
    successResponse(res, {
      students,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(totalStudents / limitNum),
        totalStudents,
        hasNext: pageNum < Math.ceil(totalStudents / limitNum),
        hasPrev: pageNum > 1
      }
    }, 'Students retrieved successfully');
  } catch (error: any) {
    console.error('Error fetching students for selection:', error);
    errorResponse(res, error.message, 500);
  }
};

// Get all batches
export const getAllBatches = async (req: Request, res: Response) => {
  try {
    const batches = await Student.distinct('batch');
    const filteredBatches = batches.filter((batch): batch is string => 
      batch !== null && batch !== undefined && batch !== ''
    );
    
    successResponse(res, {
      batches: filteredBatches.sort()
    }, 'Batches retrieved successfully');
  } catch (error: any) {
    console.error('Error fetching batches:', error);
    errorResponse(res, error.message, 500);
  }
};

// Update family status
export const updateFamilyStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse(res, 'Invalid family ID', 400);
    }

    if (!['current', 'finished'].includes(status)) {
      return errorResponse(res, 'Invalid status. Must be "current" or "finished"', 400);
    }

    const family = await Family.findById(id);
    if (!family) {
      return errorResponse(res, 'Family not found', 404);
    }

    // Check permissions
    const userId = (req as any).user?._id;
    const userRole = (req as any).user?.role;
    
    if (family.createdBy.toString() !== userId.toString() && userRole !== 'admin' && userRole !== 'moderator') {
      return errorResponse(res, 'Not authorized to update this family', 403);
    }

    const updatedFamily = await Family.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    )
    .populate('leader') // Populate virtual field
    .populate('coLeader') // Populate virtual field
    .populate('secretary') // Populate virtual field
    .populate('creator') // Populate virtual field
    .populate({
      path: 'grandParents.grandFather grandParents.grandMother',
      select: 'firstName middleName lastName gender gibyGubayeId phone email batch photo photoData'
    })
    .populate({
      path: 'grandParents.families.father.student grandParents.families.mother.student',
      select: 'firstName middleName lastName gender gibyGubayeId phone email batch photo photoData'
    })
    .populate({
      path: 'grandParents.families.children.student',
      select: 'firstName middleName lastName gender gibyGubayeId phone email batch photo photoData'
    });

    successResponse(res, updatedFamily, 'Family status updated successfully');
  } catch (error: any) {
    console.error('Error updating family status:', error);
    errorResponse(res, error.message, 500);
  }
};

// Add children to a family
export const addChildrenToFamily = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { grandParentIndex, familyIndex, children } = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse(res, 'Invalid family ID', 400);
    }

    if (grandParentIndex === undefined || familyIndex === undefined) {
      return errorResponse(res, 'grandParentIndex and familyIndex are required', 400);
    }

    if (!Array.isArray(children)) {
      return errorResponse(res, 'Children must be an array', 400);
    }

    const family = await Family.findById(id);
    if (!family) {
      return errorResponse(res, 'Family not found', 404);
    }

    // Check permissions
    const userId = (req as any).user?._id;
    const userRole = (req as any).user?.role;
    
    if (family.createdBy.toString() !== userId.toString() && userRole !== 'admin' && userRole !== 'moderator') {
      return errorResponse(res, 'Not authorized to update this family', 403);
    }

    // Validate indices
    if (!family.grandParents[grandParentIndex] || !family.grandParents[grandParentIndex].families[familyIndex]) {
      return errorResponse(res, 'Invalid grandParentIndex or familyIndex', 400);
    }

    // Validate and format children
    const formattedChildren = children.map((child: any) => ({
      student: new mongoose.Types.ObjectId(child.student),
      relationship: child.relationship || 'son',
      birthOrder: child.birthOrder,
      addedAt: new Date()
    }));

    // Validate all student IDs exist
    const studentIds = formattedChildren.map(child => child.student);
    const students = await Student.find({ _id: { $in: studentIds } });
    if (students.length !== studentIds.length) {
      return errorResponse(res, 'One or more students not found', 400);
    }

    // Check for duplicate students in the family
    const existingStudentIds = new Set<string>();
    
    // Add existing family members
    existingStudentIds.add(family.familyLeader.toString());
    existingStudentIds.add(family.familyCoLeader.toString());
    existingStudentIds.add(family.familySecretary.toString());
    
    for (const gp of family.grandParents) {
      if (gp.grandFather) existingStudentIds.add(gp.grandFather.toString());
      if (gp.grandMother) existingStudentIds.add(gp.grandMother.toString());
      
      for (const fam of gp.families) {
        existingStudentIds.add(fam.father.student.toString());
        existingStudentIds.add(fam.mother.student.toString());
        
        for (const child of fam.children) {
          existingStudentIds.add(child.student.toString());
        }
      }
    }
    
    // Check new children for duplicates
    for (const child of formattedChildren) {
      if (existingStudentIds.has(child.student.toString())) {
        return errorResponse(res, `Student is already in this family`, 400);
      }
    }

    // Validate children batch matches family batch if allowOtherBatches is false
    if (!family.allowOtherBatches) {
      const familyBatch = family.batch;
      for (const student of students) {
        if (student.batch !== familyBatch) {
          return errorResponse(res, `Student ${student.firstName} ${student.lastName} must be from batch ${familyBatch}, but is from ${student.batch}. Please enable "Allow other batches" in family settings.`, 400);
        }
      }
    }

    // Add children to the specific family
    const grandParentPath = `grandParents.${grandParentIndex}.families.${familyIndex}.children`;
    
    const updatedFamily = await Family.findByIdAndUpdate(
      id,
      {
        $push: {
          [grandParentPath]: {
            $each: formattedChildren
          }
        }
      },
      { new: true, runValidators: true }
    )
    .populate('leader') // Populate virtual field
    .populate('coLeader') // Populate virtual field
    .populate('secretary') // Populate virtual field
    .populate('creator') // Populate virtual field
    .populate({
      path: 'grandParents.grandFather grandParents.grandMother',
      select: 'firstName middleName lastName gender gibyGubayeId phone email batch photo photoData'
    })
    .populate({
      path: 'grandParents.families.father.student grandParents.families.mother.student',
      select: 'firstName middleName lastName gender gibyGubayeId phone email batch photo photoData'
    })
    .populate({
      path: 'grandParents.families.children.student',
      select: 'firstName middleName lastName gender gibyGubayeId phone email batch photo photoData'
    });

    successResponse(res, updatedFamily, 'Children added successfully');
  } catch (error: any) {
    console.error('Error adding children:', error);
    errorResponse(res, error.message, 500);
  }
};

// Remove child from family
export const removeChildFromFamily = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { grandParentIndex, familyIndex, childId } = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(childId)) {
      return errorResponse(res, 'Invalid family ID or child ID', 400);
    }

    if (grandParentIndex === undefined || familyIndex === undefined) {
      return errorResponse(res, 'grandParentIndex and familyIndex are required', 400);
    }

    const family = await Family.findById(id);
    if (!family) {
      return errorResponse(res, 'Family not found', 404);
    }

    // Check permissions
    const userId = (req as any).user?._id;
    const userRole = (req as any).user?.role;
    
    if (family.createdBy.toString() !== userId.toString() && userRole !== 'admin' && userRole !== 'moderator') {
      return errorResponse(res, 'Not authorized to update this family', 403);
    }

    // Validate indices
    if (!family.grandParents[grandParentIndex] || !family.grandParents[grandParentIndex].families[familyIndex]) {
      return errorResponse(res, 'Invalid grandParentIndex or familyIndex', 400);
    }

    // Remove child
    const grandParentPath = `grandParents.${grandParentIndex}.families.${familyIndex}.children`;
    
    const updatedFamily = await Family.findByIdAndUpdate(
      id,
      {
        $pull: {
          [grandParentPath]: {
            _id: childId
          }
        }
      },
      { new: true, runValidators: true }
    )
    .populate('leader') // Populate virtual field
    .populate('coLeader') // Populate virtual field
    .populate('secretary') // Populate virtual field
    .populate('creator') // Populate virtual field
    .populate({
      path: 'grandParents.grandFather grandParents.grandMother',
      select: 'firstName middleName lastName gender gibyGubayeId phone email batch photo photoData'
    })
    .populate({
      path: 'grandParents.families.father.student grandParents.families.mother.student',
      select: 'firstName middleName lastName gender gibyGubayeId phone email batch photo photoData'
    })
    .populate({
      path: 'grandParents.families.children.student',
      select: 'firstName middleName lastName gender gibyGubayeId phone email batch photo photoData'
    });

    successResponse(res, updatedFamily, 'Child removed successfully');
  } catch (error: any) {
    console.error('Error removing child:', error);
    errorResponse(res, error.message, 500);
  }
};

// Delete family
export const deleteFamily = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse(res, 'Invalid family ID', 400);
    }

    const family = await Family.findById(id);
    if (!family) {
      return errorResponse(res, 'Family not found', 404);
    }

    // Check permissions
    const userId = (req as any).user?._id;
    const userRole = (req as any).user?.role;
    
    if (family.createdBy.toString() !== userId.toString() && userRole !== 'admin' && userRole !== 'moderator') {
      return errorResponse(res, 'Not authorized to delete this family', 403);
    }

    await Family.findByIdAndDelete(id);

    successResponse(res, null, 'Family deleted successfully');
  } catch (error: any) {
    console.error('Error deleting family:', error);
    errorResponse(res, error.message, 500);
  }
};

// Get family statistics
export const getFamilyStatistics = async (req: Request, res: Response) => {
  try {
    // Get user ID for filtering (if non-admin)
    const userId = (req as any).user?._id;
    const userRole = (req as any).user?.role;
    
    let matchFilter: any = {};
    if (userRole !== 'admin' && userRole !== 'moderator') {
      matchFilter.createdBy = userId;
    }

    const totalFamilies = await Family.countDocuments(matchFilter);
    const currentFamilies = await Family.countDocuments({ ...matchFilter, status: 'current' });
    const finishedFamilies = await Family.countDocuments({ ...matchFilter, status: 'finished' });
    
    // Group by batch
    const batchStats = await Family.aggregate([
      { $match: { ...matchFilter, batch: { $ne: null } } },
      {
        $group: {
          _id: '$batch',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Group by location
    const locationStats = await Family.aggregate([
      { $match: { ...matchFilter, location: { $ne: null } } },
      {
        $group: {
          _id: '$location',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Recent families
    const recentFamilies = await Family.find(matchFilter)
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title location batch status familyDate createdBy')
      .populate('creator', 'name')
      .lean();

    successResponse(res, {
      totalFamilies,
      currentFamilies,
      finishedFamilies,
      batchStats,
      locationStats,
      recentFamilies
    }, 'Statistics retrieved successfully');
  } catch (error: any) {
    console.error('Error fetching stats:', error);
    errorResponse(res, error.message, 500);
  }
};

// Get families for current user
export const getUserFamilies = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?._id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string || '';

    const skip = (page - 1) * limit;

    const filter: any = { createdBy: userId };
    if (status) {
      filter.status = status;
    }

    const families = await Family.find(filter)
      .populate('leader') // Populate virtual field
      .populate('coLeader') // Populate virtual field
      .populate('secretary') // Populate virtual field
      .sort({ familyDate: -1 })
      .skip(skip)
      .limit(limit);

    const totalFamilies = await Family.countDocuments(filter);
    const totalPages = Math.ceil(totalFamilies / limit);

    successResponse(res, {
      families,
      pagination: {
        currentPage: page,
        totalPages,
        totalFamilies,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    }, 'User families retrieved successfully');
  } catch (error: any) {
    console.error('Error fetching user families:', error);
    errorResponse(res, error.message, 500);
  }
};

// Add this function to the familyController.ts file

// Add this function to the familyController.ts file

export const autoAssignChildren = async (req: Request, res: Response) => {
  try {
    const {
      mode, // 'homogeneous' | 'heterogeneous'
      targetBatch,
      maxChildrenPerFamily = 4,
      considerGenderBalance = true,
      considerAge = true,
      addressLevel = 'kebele' // for homogeneous mode: 'kebele' | 'wereda' | 'zone' | 'region'
    } = req.body;

    const userId = (req as any).user?._id;
    const userRole = (req as any).user?.role;

    // Validate required parameters
    if (!mode || !targetBatch) {
      return errorResponse(res, 'Mode and target batch are required', 400);
    }

    if (mode !== 'homogeneous' && mode !== 'heterogeneous') {
      return errorResponse(res, 'Mode must be either "homogeneous" or "heterogeneous"', 400);
    }

    // Step 1: Find eligible families (with both parents)
    const eligibleFamilies = await Family.find({
      'grandParents.families': { $exists: true, $not: { $size: 0 } },
      status: 'current'
    })
      .populate('leader')
      .populate('coLeader')
      .populate('secretary')
      .populate({
        path: 'grandParents.grandFather grandParents.grandMother',
        select: 'firstName lastName gender batch'
      })
      .populate({
        path: 'grandParents.families.father.student grandParents.families.mother.student',
        select: 'firstName lastName gender batch region zone wereda kebele dateOfBirth gibyGubayeId'
      })
      .populate({
        path: 'grandParents.families.children.student',
        select: 'firstName lastName gender batch region zone wereda kebele dateOfBirth gibyGubayeId'
      })
      .lean();

    if (eligibleFamilies.length === 0) {
      return errorResponse(res, 'No eligible families found (families with both parents)', 400);
    }

    // Step 2: Get ALL students from the target batch
    const allStudentsInBatch = await Student.find({
      batch: targetBatch,
      isActive: true
    })
    .select('firstName lastName gender batch region zone wereda kebele dateOfBirth gibyGubayeId')
    .lean();
    
    if (allStudentsInBatch.length === 0) {
      return errorResponse(res, `No students found in batch ${targetBatch}`, 400);
    }

    console.log(`Total students in batch ${targetBatch}: ${allStudentsInBatch.length}`);
    console.log(`Total eligible families: ${eligibleFamilies.length}`);

    // Define types
    type StudentInfo = {
      _id: mongoose.Types.ObjectId;
      firstName: string;
      lastName: string;
      gender: 'male' | 'female';
      batch: string;
      region?: string;
      zone?: string;
      wereda?: string;
      kebele?: string;
      dateOfBirth?: Date;
      gibyGubayeId?: string;
    };

    // Step 3: Create a map to track which students are already used in this auto-assignment
    // This prevents assigning the same student multiple times in this operation
    const newlyAssignedStudentIds = new Set<string>();

    // Step 4: Prepare family assignments
    interface FamilyAssignment {
      familyId: string;
      familyObject: any;
      gpIndex: number;
      familyIndex: number;
      father: StudentInfo;
      mother: StudentInfo;
      existingChildren: any[];
      address: {
        region: string;
        zone: string;
        wereda: string;
        kebele: string;
      };
      genderStats: {
        sons: number;
        daughters: number;
      };
      capacity: number;
      commonAddressLevel?: string;
      commonAddressValue?: string;
      parentsFromTargetBatch: boolean;
      // Track ALL students already in THIS specific family document
      studentsInThisFamilyDoc: Set<string>;
    }

    const familyAssignments: FamilyAssignment[] = [];

    // Process each eligible family
    for (const family of eligibleFamilies) {
      const familyData = family as any;
      
      // Create a set of ALL students already in THIS family document
      const studentsInThisFamilyDoc = new Set<string>();
      
      // Add leaders (family level)
      studentsInThisFamilyDoc.add(familyData.familyLeader.toString());
      studentsInThisFamilyDoc.add(familyData.familyCoLeader.toString());
      studentsInThisFamilyDoc.add(familyData.familySecretary.toString());
      
      // Add grand parents
      if (familyData.grandParents) {
        for (const gp of familyData.grandParents) {
          if (gp.grandFather) studentsInThisFamilyDoc.add(gp.grandFather.toString());
          if (gp.grandMother) studentsInThisFamilyDoc.add(gp.grandMother.toString());
          
          // Add ALL parents and children from ALL family pairs in this document
          if (gp.families) {
            for (const familyMember of gp.families) {
              if (familyMember.father?.student) {
                studentsInThisFamilyDoc.add(familyMember.father.student._id.toString());
              }
              if (familyMember.mother?.student) {
                studentsInThisFamilyDoc.add(familyMember.mother.student._id.toString());
              }
              
              // Add existing children
              if (familyMember.children) {
                for (const child of familyMember.children) {
                  if (child.student) {
                    studentsInThisFamilyDoc.add(child.student._id.toString());
                  }
                }
              }
            }
          }
        }
      }
      
      // Now process each family pair
      if (familyData.grandParents) {
        for (let gpIndex = 0; gpIndex < familyData.grandParents.length; gpIndex++) {
          const gp = familyData.grandParents[gpIndex];
          
          if (gp.families) {
            for (let familyIndex = 0; familyIndex < gp.families.length; familyIndex++) {
              const familyMember = gp.families[familyIndex];
              
              // Get parents
              const father = familyMember.father?.student as StudentInfo;
              const mother = familyMember.mother?.student as StudentInfo;
              
              if (!father || !mother) {
                continue;
              }

              // Check if parents are from target batch
              const parentsFromTargetBatch = father.batch === targetBatch && mother.batch === targetBatch;
              
              // Skip families that don't allow other batches and parents are not from target batch
              if (!familyData.allowOtherBatches && !parentsFromTargetBatch) {
                continue;
              }

              // Calculate gender stats
              const existingChildren = familyMember.children || [];
              const sons = existingChildren.filter((c: any) => c.relationship === 'son').length;
              const daughters = existingChildren.filter((c: any) => c.relationship === 'daughter').length;
              
              // Calculate common address level for homogeneous mode
              let commonAddressLevel: string | undefined = undefined;
              let commonAddressValue: string | undefined = undefined;
              
              if (father.region && mother.region && father.region === mother.region) {
                commonAddressLevel = 'region';
                commonAddressValue = father.region;
                
                if (father.zone && mother.zone && father.zone === mother.zone) {
                  commonAddressLevel = 'zone';
                  commonAddressValue = father.zone;
                  
                  if (father.wereda && mother.wereda && father.wereda === mother.wereda) {
                    commonAddressLevel = 'wereda';
                    commonAddressValue = father.wereda;
                    
                    if (father.kebele && mother.kebele && father.kebele === mother.kebele) {
                      commonAddressLevel = 'kebele';
                      commonAddressValue = father.kebele;
                    }
                  }
                }
              }

              familyAssignments.push({
                familyId: familyData._id.toString(),
                familyObject: familyData,
                gpIndex,
                familyIndex,
                father,
                mother,
                existingChildren,
                address: {
                  region: father.region || '',
                  zone: father.zone || '',
                  wereda: father.wereda || '',
                  kebele: father.kebele || ''
                },
                genderStats: { sons, daughters },
                capacity: Math.max(0, maxChildrenPerFamily - existingChildren.length),
                commonAddressLevel,
                commonAddressValue,
                parentsFromTargetBatch,
                studentsInThisFamilyDoc: new Set(studentsInThisFamilyDoc) // Copy for this family pair
              });
            }
          }
        }
      }
    }

    // Filter out families with no capacity
    let eligibleFamilyAssignments = familyAssignments.filter(f => f.capacity > 0);
    
    // For homogeneous mode, also filter families that have no common address
    if (mode === 'homogeneous') {
      eligibleFamilyAssignments = eligibleFamilyAssignments.filter(f => f.commonAddressLevel);
    }

    if (eligibleFamilyAssignments.length === 0) {
      return errorResponse(res, 'No families available for assignment with current criteria', 400);
    }

    console.log(`Families with capacity: ${eligibleFamilyAssignments.length}`);

    // Step 5: Sort families by priority
    eligibleFamilyAssignments.sort((a, b) => {
      // First by number of existing children (ascending)
      const aTotalChildren = a.existingChildren.length;
      const bTotalChildren = b.existingChildren.length;
      
      if (aTotalChildren !== bTotalChildren) {
        return aTotalChildren - bTotalChildren;
      }
      
      // Then by gender imbalance (descending imbalance)
      const aImbalance = Math.abs(a.genderStats.sons - a.genderStats.daughters);
      const bImbalance = Math.abs(b.genderStats.sons - b.genderStats.daughters);
      
      return bImbalance - aImbalance;
    });

    // Step 6: Assignment algorithm
    interface Assignment {
      familyId: string;
      familyTitle: string;
      gpIndex: number;
      familyIndex: number;
      studentId: string;
      student: StudentInfo;
      relationship: 'son' | 'daughter';
      birthOrder: number;
      addressMatch?: string;
      diversityScore?: number;
    }

    const assignments: Assignment[] = [];
    const failedAssignments: Array<{
      familyId: string;
      familyTitle: string;
      reason: string;
    }> = [];

    // Helper function to calculate diversity score
    const calculateDiversityScore = (child: StudentInfo, father: StudentInfo, mother: StudentInfo): number => {
      let score = 0;
      
      // Different region (most diverse)
      if (child.region !== father.region && child.region !== mother.region) {
        score += 4;
      }
      // Same region, different zone
      else if (child.region === father.region || child.region === mother.region) {
        if (child.zone && (child.zone !== father.zone || child.zone !== mother.zone)) {
          score += 3;
        }
        // Same zone, different wereda
        else if (child.zone && child.zone === father.zone && child.zone === mother.zone) {
          if (child.wereda && (child.wereda !== father.wereda || child.wereda !== mother.wereda)) {
            score += 2;
          }
          // Same wereda, different kebele
          else if (child.wereda && child.wereda === father.wereda && child.wereda === mother.wereda) {
            if (child.kebele && (child.kebele !== father.kebele || child.kebele !== mother.kebele)) {
              score += 1;
            }
          }
        }
      }
      
      return score;
    };

    // Helper function to check age appropriateness
    const isAgeAppropriate = (child: StudentInfo, father: StudentInfo, mother: StudentInfo): boolean => {
      if (!considerAge || !child.dateOfBirth || !father.dateOfBirth || !mother.dateOfBirth) {
        return true;
      }
      
      const childAge = new Date().getFullYear() - new Date(child.dateOfBirth).getFullYear();
      const fatherAge = new Date().getFullYear() - new Date(father.dateOfBirth).getFullYear();
      const motherAge = new Date().getFullYear() - new Date(mother.dateOfBirth).getFullYear();
      
      // Prefer children younger than parents, but allow similar age if necessary
      return childAge <= Math.max(fatherAge, motherAge) + 5;
    };

    // Helper function to get gender preference for family
    const getGenderPreference = (genderStats: { sons: number; daughters: number }): 'male' | 'female' | 'any' => {
      if (!considerGenderBalance) return 'any';
      
      if (genderStats.sons > genderStats.daughters) {
        return 'female'; // Need more daughters
      } else if (genderStats.daughters > genderStats.sons) {
        return 'male'; // Need more sons
      } else {
        return 'any'; // Balanced
      }
    };

    // Main assignment loop
    for (const familyAssignment of eligibleFamilyAssignments) {
      if (familyAssignment.capacity <= 0) continue;
      
      let assignedCount = 0;
      const availableStudentsForThisFamily = allStudentsInBatch.filter((student: any) => {
        const studentId = student._id.toString();
        
        // Skip if student is already in THIS family document
        if (familyAssignment.studentsInThisFamilyDoc.has(studentId)) {
          return false;
        }
        
        // Skip if student is already assigned in THIS auto-assignment session
        if (newlyAssignedStudentIds.has(studentId)) {
          return false;
        }
        
        return true;
      }) as unknown as StudentInfo[];
      
      while (assignedCount < familyAssignment.capacity && availableStudentsForThisFamily.length > 0) {
        let bestCandidate: StudentInfo | null = null;
        let bestCandidateIndex: number = -1;
        let bestScore = -1;
        let bestAddressMatch: string | undefined = undefined;
        
        // Find best candidate for this family
        for (let i = 0; i < availableStudentsForThisFamily.length; i++) {
          const student = availableStudentsForThisFamily[i];
          
          // Check batch compliance
          if (!familyAssignment.familyObject.allowOtherBatches) {
            // If family doesn't allow other batches, children must be from target batch
            if (student.batch !== targetBatch) {
              continue;
            }
          }
          
          // Check age appropriateness
          if (!isAgeAppropriate(student, familyAssignment.father, familyAssignment.mother)) {
            continue;
          }
          
          // Check gender preference
          const genderPreference = getGenderPreference(familyAssignment.genderStats);
          if (genderPreference !== 'any' && student.gender !== genderPreference) {
            continue;
          }
          
          let score = 0;
          let addressMatch: string | undefined = undefined;
          
          if (mode === 'homogeneous' && familyAssignment.commonAddressLevel) {
            // For homogeneous: match address level
            const studentAddress = student[familyAssignment.commonAddressLevel as keyof StudentInfo] as string | undefined;
            
            if (studentAddress && studentAddress === familyAssignment.commonAddressValue) {
              score = 100; // Perfect match
              addressMatch = `Matched ${familyAssignment.commonAddressLevel}: ${studentAddress}`;
            } else {
              // Try next level if exact match not found
              const levels = ['kebele', 'wereda', 'zone', 'region'];
              const currentLevelIndex = levels.indexOf(familyAssignment.commonAddressLevel);
              
              for (let j = currentLevelIndex + 1; j < levels.length; j++) {
                const level = levels[j];
                const studentValue = student[level as keyof StudentInfo] as string | undefined;
                const familyValue = familyAssignment.father[level as keyof StudentInfo] as string | undefined;
                
                if (studentValue && familyValue && studentValue === familyValue) {
                  score = 50 - (j * 10); // Lower score for less specific match
                  addressMatch = `Matched ${level}: ${studentValue}`;
                  break;
                }
              }
            }
            
            if (score === 0) {
              continue; // No address match at any level
            }
          } else {
            // For heterogeneous: calculate diversity score
            score = calculateDiversityScore(student, familyAssignment.father, familyAssignment.mother);
            if (score === 0) {
              continue; // Avoid zero diversity (exact same address)
            }
          }
          
          // Tie-breakers
          // 1. Age: prefer younger
          let tieBreakerScore = 0;
          if (student.dateOfBirth) {
            const age = new Date().getFullYear() - new Date(student.dateOfBirth).getFullYear();
            tieBreakerScore += (30 - age) * 0.1; // Younger gets higher score
          }
          
          // 2. Gender need
          const genderNeed = Math.abs(familyAssignment.genderStats.sons - familyAssignment.genderStats.daughters);
          if (genderPreference === student.gender) {
            tieBreakerScore += genderNeed * 0.05;
          }
          
          const totalScore = score + tieBreakerScore;
          
          if (totalScore > bestScore) {
            bestScore = totalScore;
            bestCandidate = student;
            bestCandidateIndex = i;
            bestAddressMatch = addressMatch;
          }
        }
        
        if (!bestCandidate || bestCandidateIndex === -1) {
          // No suitable candidate found for this family
          failedAssignments.push({
            familyId: familyAssignment.familyId,
            familyTitle: familyAssignment.familyObject.title,
            reason: `No suitable students available matching criteria`
          });
          break;
        }
        
        // Determine relationship based on gender
        const relationship: 'son' | 'daughter' = bestCandidate.gender === 'male' ? 'son' : 'daughter';
        
        // Calculate birth order
        const birthOrder = familyAssignment.existingChildren.length + assignedCount + 1;
        
        // Create assignment object
        const assignment: Assignment = {
          familyId: familyAssignment.familyId,
          familyTitle: familyAssignment.familyObject.title,
          gpIndex: familyAssignment.gpIndex,
          familyIndex: familyAssignment.familyIndex,
          studentId: bestCandidate._id.toString(),
          student: bestCandidate,
          relationship,
          birthOrder
        };

        // Add mode-specific properties
        if (mode === 'homogeneous') {
          assignment.addressMatch = bestAddressMatch;
        } else {
          assignment.diversityScore = bestScore;
        }
        
        assignments.push(assignment);
        
        // Add student to tracking sets
        newlyAssignedStudentIds.add(bestCandidate._id.toString());
        
        // Remove the assigned student from available pool for this family
        availableStudentsForThisFamily.splice(bestCandidateIndex, 1);
        
        // Update family gender stats for next iteration
        if (relationship === 'son') {
          familyAssignment.genderStats.sons++;
        } else {
          familyAssignment.genderStats.daughters++;
        }
        
        assignedCount++;
      }
    }

    // Step 7: Return preview without saving (for review step)
    const totalAssigned = assignments.length;
    const totalFamiliesAffected = new Set(assignments.map(a => a.familyId)).size;
    const uniqueStudentIds = new Set(assignments.map(a => a.studentId));
    
    // Calculate gender distribution
    const sonsAssigned = assignments.filter(a => a.relationship === 'son').length;
    const daughtersAssigned = assignments.filter(a => a.relationship === 'daughter').length;
    
    // Calculate address match quality for homogeneous mode
    let matchQuality = 0;
    if (mode === 'homogeneous') {
      const exactMatches = assignments.filter(a => a.addressMatch?.includes('Matched')).length;
      matchQuality = totalAssigned > 0 ? exactMatches / totalAssigned : 0;
    }
    
    // Calculate average diversity score for heterogeneous mode
    let averageDiversity = 0;
    if (mode === 'heterogeneous') {
      const totalScore = assignments.reduce((sum, a) => sum + (a.diversityScore || 0), 0);
      averageDiversity = totalAssigned > 0 ? totalScore / totalAssigned : 0;
    }
    
    successResponse(res, {
      preview: true,
      assignments,
      statistics: {
        totalAssigned,
        totalFamiliesAffected,
        uniqueStudentsAssigned: uniqueStudentIds.size,
        genderDistribution: {
          sons: sonsAssigned,
          daughters: daughtersAssigned,
          balance: Math.abs(sonsAssigned - daughtersAssigned)
        },
        ...(mode === 'homogeneous' ? {
          addressMatchQuality: matchQuality,
          qualityLevel: matchQuality >= 0.8 ? 'Excellent' : matchQuality >= 0.5 ? 'Good' : 'Poor'
        } : {
          averageDiversityScore: averageDiversity,
          diversityLevel: averageDiversity >= 3 ? 'High' : averageDiversity >= 2 ? 'Medium' : 'Low'
        })
      },
      configuration: {
        mode,
        targetBatch,
        maxChildrenPerFamily,
        considerGenderBalance,
        considerAge,
        addressLevel
      },
      failedAssignments: failedAssignments.length > 0 ? failedAssignments : undefined
    }, 'Preview generated successfully. Review and confirm to save.');
    
  } catch (error: any) {
    console.error('Error in autoAssignChildren:', error);
    errorResponse(res, error.message || 'Failed to auto-assign children', 500);
  }
};

// Add this new endpoint to execute the assignments after review
export const executeAutoAssignChildren = async (req: Request, res: Response) => {
  try {
    const { assignments } = req.body;
    
    if (!Array.isArray(assignments) || assignments.length === 0) {
      return errorResponse(res, 'No assignments to execute', 400);
    }

    const session = await mongoose.startSession();
    
    try {
      session.startTransaction();
      
      const assignmentResults: any[] = [];
      
      for (const assignment of assignments) {
        const { familyId, gpIndex, familyIndex, studentId, relationship, birthOrder } = assignment;
        
        const family = await Family.findById(familyId).session(session);
        
        if (!family) {
          throw new Error(`Family ${familyId} not found`);
        }
        
        // Validate that student is not already in this family
        const studentIdStr = studentId.toString();
        const familyStudentIds = new Set<string>();
        
        // Collect all student IDs in this family
        familyStudentIds.add(family.familyLeader.toString());
        familyStudentIds.add(family.familyCoLeader.toString());
        familyStudentIds.add(family.familySecretary.toString());
        
        for (const gp of family.grandParents) {
          if (gp.grandFather) familyStudentIds.add(gp.grandFather.toString());
          if (gp.grandMother) familyStudentIds.add(gp.grandMother.toString());
          
          for (const fam of gp.families) {
            familyStudentIds.add(fam.father.student.toString());
            familyStudentIds.add(fam.mother.student.toString());
            
            for (const child of fam.children) {
              familyStudentIds.add(child.student.toString());
            }
          }
        }
        
        if (familyStudentIds.has(studentIdStr)) {
          throw new Error(`Student ${studentId} is already in family ${family.title}`);
        }
        
        const grandParentPath = `grandParents.${gpIndex}.families.${familyIndex}.children`;
        
        const childData = {
          student: new mongoose.Types.ObjectId(studentId),
          relationship,
          birthOrder,
          addedAt: new Date()
        };
        
        await Family.findByIdAndUpdate(
          familyId,
          {
            $push: {
              [grandParentPath]: childData
            }
          },
          { session, new: true }
        );
        
        assignmentResults.push({
          familyTitle: family.title,
          studentId: assignment.student.gibyGubayeId || 'N/A',
          studentName: `${assignment.student.firstName} ${assignment.student.lastName}`,
          relationship,
          birthOrder,
          addressMatch: assignment.addressMatch,
          diversityScore: assignment.diversityScore
        });
      }
      
      await session.commitTransaction();
      
      successResponse(res, {
        assignments: assignmentResults,
        message: `Successfully assigned ${assignments.length} children`
      }, 'Assignments executed successfully');
      
    } catch (error: any) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
    
  } catch (error: any) {
    console.error('Error executing assignments:', error);
    errorResponse(res, error.message || 'Failed to execute assignments', 500);
  }
};