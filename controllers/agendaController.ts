import { Request, Response } from 'express';
import Agenda, { IAgenda, IAgendaDiscussion, IAgendaTitle } from '../models/Agenda';
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

// Get all agendas with pagination and filtering
export const getAllAgendas = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string || '';
    const status = req.query.status as string || '';
    const meetingClass = req.query.meetingClass as string || '';
    const location = req.query.location as string || '';
    const createdBy = req.query.createdBy as string || '';
    const fromDate = req.query.fromDate as string || '';
    const toDate = req.query.toDate as string || '';
    const sortBy = req.query.sortBy as string || 'draftDate';
    const sortOrder = req.query.sortOrder as string === 'asc' ? 1 : -1;

    const skip = (page - 1) * limit;

    // Build filter object
    const filter: any = {};
    
    if (search) {
      filter.$or = [
        { meetingClass: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
        { 'agendaTitles.title': { $regex: search, $options: 'i' } }
      ];
    }
    
    if (status) {
      filter.status = status;
    }
    
    if (meetingClass) {
      filter.meetingClass = meetingClass;
    }
    
    if (location) {
      filter.location = { $regex: location, $options: 'i' };
    }
    
    if (createdBy && mongoose.Types.ObjectId.isValid(createdBy)) {
      filter.createdBy = createdBy;
    }

    // Date range filtration - Filter by draftDate
    if (fromDate || toDate) {
      filter.draftDate = {};
      
      if (fromDate) {
        // Parse fromDate and set to start of day
        const from = new Date(fromDate);
        from.setHours(0, 0, 0, 0);
        filter.draftDate.$gte = from;
      }
      
      if (toDate) {
        // Parse toDate and set to end of day
        const to = new Date(toDate);
        to.setHours(23, 59, 59, 999);
        filter.draftDate.$lte = to;
      }
    }

    // Sort object
    const sort: any = {};
    sort[sortBy] = sortOrder;

    const agendas = await Agenda.find(filter)
      .populate('createdBy', 'name email role')
      .populate('approvedBy', 'name email role')
      .populate('draftContributors', 'firstName middleName lastName gender gibyGubayeId phone email')
      .populate('meetingContributors', 'firstName middleName lastName gender gibyGubayeId phone email')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const totalAgendas = await Agenda.countDocuments(filter);
    const totalPages = Math.ceil(totalAgendas / limit);

    successResponse(res, {
      agendas,
      pagination: {
        currentPage: page,
        totalPages,
        totalAgendas,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    }, 'Agendas retrieved successfully');
  } catch (error: any) {
    console.error('Error fetching agendas:', error);
    errorResponse(res, error.message, 500);
  }
};

// Get single agenda by ID
export const getAgenda = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse(res, 'Invalid agenda ID', 400);
    }

    const agenda = await Agenda.findById(id)
      .populate('createdBy', 'name email role')
      .populate('approvedBy', 'name email role')
      .populate('draftContributors', 'firstName middleName lastName gender gibyGubayeId phone email')
      .populate('meetingContributors', 'firstName middleName lastName gender gibyGubayeId phone email');

    if (!agenda) {
      return errorResponse(res, 'Agenda not found', 404);
    }

    successResponse(res, agenda, 'Agenda retrieved successfully');
  } catch (error: any) {
    errorResponse(res, error.message, 500);
  }
};

// Create new agenda (status: pending)
export const createAgenda = async (req: Request, res: Response) => {
  try {
    const {
      meetingClass,
      location,
      draftContributors,
      agendaTitles
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

    // Validate draft contributors (must be valid Student IDs)
    const validContributors = Array.isArray(draftContributors) 
      ? draftContributors.filter((id: string) => mongoose.Types.ObjectId.isValid(id))
      : [];

    // Verify all contributor IDs are valid students
    if (validContributors.length > 0) {
      const students = await Student.find({ _id: { $in: validContributors } });
      if (students.length !== validContributors.length) {
        return errorResponse(res, 'One or more student contributors not found', 400);
      }
    }

    // Parse agenda titles
    let titlesArray: IAgendaTitle[] = [];
    if (agendaTitles && Array.isArray(agendaTitles)) {
      titlesArray = agendaTitles.map((title: any) => ({
        title: title.title?.trim() || '',
        discussions: []
      })).filter((item: IAgendaTitle) => item.title.length > 0);
    }

    if (titlesArray.length === 0) {
      return errorResponse(res, 'At least one agenda title is required', 400);
    }

    const newAgenda = new Agenda({
      meetingClass: meetingClass?.trim() || '',
      location: location?.trim() || '',
      draftContributors: validContributors,
      agendaTitles: titlesArray,
      meetingContributors: validContributors, // Initialize with draft contributors
      status: 'pending', // Always set to PENDING by default
      createdBy,
      draftDate: new Date()
    });

    await newAgenda.save();
    
    // Populate references
    const populatedAgenda = await Agenda.findById(newAgenda._id)
      .populate('createdBy', 'name email role')
      .populate('draftContributors', 'firstName middleName lastName gender gibyGubayeId phone email');

    successResponse(res, populatedAgenda, 'Agenda created successfully');
  } catch (error: any) {
    console.error('Error creating agenda:', error);
    errorResponse(res, error.message, 500);
  }
};

// Update agenda (only allowed for pending agendas)
export const updateAgenda = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse(res, 'Invalid agenda ID', 400);
    }

    const agenda = await Agenda.findById(id);
    if (!agenda) {
      return errorResponse(res, 'Agenda not found', 404);
    }

    // Check if user has permission (admin or the creator)
    const userId = (req as any).user?._id;
    const userRole = (req as any).user?.role;
    
    // Only allow updates for pending agendas by creator or admin
    if (agenda.status !== 'pending' && agenda.createdBy.toString() !== userId.toString() && userRole !== 'admin') {
      return errorResponse(res, 'Only pending agendas can be edited by creator', 403);
    }

    // For non-admin users, they can only update their own pending agendas
    if (agenda.createdBy.toString() !== userId.toString() && userRole !== 'admin' && userRole !== 'moderator') {
      return errorResponse(res, 'Not authorized to update this agenda', 403);
    }

    // Remove status field from update if it's not admin
    if (agenda.createdBy.toString() === userId.toString() && userRole !== 'admin' && userRole !== 'moderator') {
      delete req.body.status;
    }

    // Parse draft contributors
    if (req.body.draftContributors) {
      if (Array.isArray(req.body.draftContributors)) {
        req.body.draftContributors = req.body.draftContributors.filter((id: string) => 
          mongoose.Types.ObjectId.isValid(id)
        );
        
        // Verify all contributor IDs are valid students
        if (req.body.draftContributors.length > 0) {
          const students = await Student.find({ _id: { $in: req.body.draftContributors } });
          if (students.length !== req.body.draftContributors.length) {
            return errorResponse(res, 'One or more student contributors not found', 400);
          }
        }
      }
    }

    // Parse agenda titles
    if (req.body.agendaTitles && Array.isArray(req.body.agendaTitles)) {
      req.body.agendaTitles = req.body.agendaTitles.map((title: any) => ({
        title: title.title?.trim() || '',
        discussions: title.discussions || []
      })).filter((item: IAgendaTitle) => item.title.length > 0);
      
      if (req.body.agendaTitles.length === 0) {
        return errorResponse(res, 'At least one agenda title is required', 400);
      }
    }

    const updatedAgenda = await Agenda.findByIdAndUpdate(
      id,
      { ...req.body },
      { new: true, runValidators: true }
    )
    .populate('createdBy', 'name email role')
    .populate('draftContributors', 'firstName middleName lastName gender gibyGubayeId phone email')
    .populate('meetingContributors', 'firstName middleName lastName gender gibyGubayeId phone email');

    successResponse(res, updatedAgenda, 'Agenda updated successfully');
  } catch (error: any) {
    console.error('Error updating agenda:', error);
    errorResponse(res, error.message, 500);
  }
};

// Approve agenda (change status to approved)
export const approveAgenda = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse(res, 'Invalid agenda ID', 400);
    }

    const agenda = await Agenda.findById(id);
    if (!agenda) {
      return errorResponse(res, 'Agenda not found', 404);
    }

    // Check permissions - only admin/moderator can approve
    const userRole = (req as any).user?.role;
    if (userRole !== 'admin' && userRole !== 'moderator') {
      return errorResponse(res, 'Only admin or moderator can approve agendas', 403);
    }

    // Check if agenda is pending
    if (agenda.status !== 'pending') {
      return errorResponse(res, `Agenda is already ${agenda.status}`, 400);
    }

    const updatedAgenda = await Agenda.findByIdAndUpdate(
      id,
      {
        status: 'approved',
        approvedBy: (req as any).user?._id
      },
      { new: true, runValidators: true }
    )
    .populate('createdBy', 'name email role')
    .populate('approvedBy', 'name email role')
    .populate('draftContributors', 'firstName middleName lastName gender gibyGubayeId phone email')
    .populate('meetingContributors', 'firstName middleName lastName gender gibyGubayeId phone email');

    successResponse(res, updatedAgenda, 'Agenda approved successfully');
  } catch (error: any) {
    console.error('Error approving agenda:', error);
    errorResponse(res, error.message, 500);
  }
};

// Continue agenda - add discussions and complete
export const continueAgenda = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      agendaTitles,
      generalMeetingSummary,
      meetingContributors,
      status
    } = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse(res, 'Invalid agenda ID', 400);
    }

    const agenda = await Agenda.findById(id);
    if (!agenda) {
      return errorResponse(res, 'Agenda not found', 404);
    }

    // Check if agenda is approved
    if (agenda.status !== 'approved') {
      return errorResponse(res, 'Only approved agendas can be continued', 400);
    }

    // Check if user has permission (admin, moderator, or creator)
    const userId = (req as any).user?._id;
    const userRole = (req as any).user?.role;
    
    if (agenda.createdBy.toString() !== userId.toString() && userRole !== 'admin' && userRole !== 'moderator') {
      return errorResponse(res, 'Not authorized to continue this agenda', 403);
    }

    const updateData: any = {};

    // Update agenda titles with discussions
    if (agendaTitles && Array.isArray(agendaTitles)) {
      // Map through existing titles and update discussions
      const updatedTitles = agenda.agendaTitles.map((existingTitle: IAgendaTitle, index: number) => {
        const newTitle = agendaTitles[index];
        
        if (newTitle && newTitle.discussions && Array.isArray(newTitle.discussions)) {
          // Create new discussions array with timestamps for new discussions
          const discussionsWithTimestamp = newTitle.discussions.map((disc: any) => {
            // Check if this discussion already exists (has _id)
            const isExistingDiscussion = disc._id;
            
            if (isExistingDiscussion) {
              // Keep existing discussion with its timestamp
              return {
                question: disc.question || '',
                answer: disc.answer || '',
                summary: disc.summary || '',
                discussedAt: disc.discussedAt || new Date()
              };
            } else {
              // New discussion - add timestamp
              return {
                question: disc.question || '',
                answer: disc.answer || '',
                summary: disc.summary || '',
                discussedAt: disc.discussedAt || new Date()
              };
            }
          });
          
          return {
            title: existingTitle.title,
            discussions: discussionsWithTimestamp
          };
        }
        
        // Return existing title if no new discussions
        return existingTitle;
      });
      
      updateData.agendaTitles = updatedTitles;
    }

    // Update meeting summary if provided
    if (generalMeetingSummary !== undefined) {
      updateData.generalMeetingSummary = generalMeetingSummary.trim();
    }

    // Update meeting contributors if provided
    if (meetingContributors && Array.isArray(meetingContributors)) {
      updateData.meetingContributors = meetingContributors.filter((id: string) => 
        mongoose.Types.ObjectId.isValid(id)
      );
      
      // Verify all meeting contributor IDs are valid students
      if (updateData.meetingContributors.length > 0) {
        const students = await Student.find({ _id: { $in: updateData.meetingContributors } });
        if (students.length !== updateData.meetingContributors.length) {
          return errorResponse(res, 'One or more meeting contributors not found', 400);
        }
      }
    }

    // Update status if changing to completed
    if (status === 'completed') {
      updateData.status = 'completed';
      updateData.meetingDate = new Date();
    }

    const updatedAgenda = await Agenda.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    )
    .populate('createdBy', 'name email role')
    .populate('approvedBy', 'name email role')
    .populate('draftContributors', 'firstName middleName lastName gender gibyGubayeId phone email')
    .populate('meetingContributors', 'firstName middleName lastName gender gibyGubayeId phone email');

    successResponse(res, updatedAgenda, 'Agenda updated successfully');
  } catch (error: any) {
    console.error('Error continuing agenda:', error);
    errorResponse(res, error.message, 500);
  }
};

// Delete agenda
export const deleteAgenda = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse(res, 'Invalid agenda ID', 400);
    }

    const agenda = await Agenda.findById(id);
    if (!agenda) {
      return errorResponse(res, 'Agenda not found', 404);
    }

    // Check if agenda is pending - only allow deletion of pending agendas
    if (agenda.status !== 'pending') {
      return errorResponse(res, 'Only pending agendas can be deleted', 400);
    }

    // Check if user has permission (admin, moderator or the creator)
    const userId = (req as any).user?._id;
    const userRole = (req as any).user?.role;
    
    if (agenda.createdBy.toString() !== userId.toString() && userRole !== 'admin' && userRole !== 'moderator') {
      return errorResponse(res, 'Not authorized to delete this agenda', 403);
    }

    await Agenda.findByIdAndDelete(id);

    successResponse(res, null, 'Agenda deleted successfully');
  } catch (error: any) {
    errorResponse(res, error.message, 500);
  }
};

// Get agenda statistics
export const getAgendaStatistics = async (req: Request, res: Response) => {
  try {
    // Get user ID for filtering (if non-admin)
    const userId = (req as any).user?._id;
    const userRole = (req as any).user?.role;
    
    // Build match filter based on user role
    let matchFilter: any = {};
    if (userRole !== 'admin' && userRole !== 'moderator') {
      matchFilter.createdBy = userId;
    }

    // Add date range filter if provided
    const fromDate = req.query.fromDate as string;
    const toDate = req.query.toDate as string;
    
    if (fromDate || toDate) {
      matchFilter.draftDate = {};
      
      if (fromDate) {
        const from = new Date(fromDate);
        from.setHours(0, 0, 0, 0);
        matchFilter.draftDate.$gte = from;
      }
      
      if (toDate) {
        const to = new Date(toDate);
        to.setHours(23, 59, 59, 999);
        matchFilter.draftDate.$lte = to;
      }
    }

    const totalAgendas = await Agenda.countDocuments(matchFilter);
    const pendingAgendas = await Agenda.countDocuments({ ...matchFilter, status: 'pending' });
    const approvedAgendas = await Agenda.countDocuments({ ...matchFilter, status: 'approved' });
    const completedAgendas = await Agenda.countDocuments({ ...matchFilter, status: 'completed' });
    const draftAgendas = await Agenda.countDocuments({ ...matchFilter, status: 'draft' });
    
    // Group by meeting class
    const classStats = await Agenda.aggregate([
      { $match: { ...matchFilter, meetingClass: { $ne: null } } },
      {
        $group: {
          _id: '$meetingClass',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Group by status
    const statusStats = await Agenda.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Group by month
    const monthlyStats = await Agenda.aggregate([
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

    // Recent agendas - FIXED: Changed from 'firstName lastName' to 'name'
    const recentAgendas = await Agenda.find(matchFilter)
      .sort({ createdAt: -1 })
      .limit(5)
      .select('meetingClass location status draftDate createdBy')
      .populate('createdBy', 'name')  // ← FIXED HERE
      .lean();

    successResponse(res, {
      totalPending: pendingAgendas,
      totalApproved: approvedAgendas,
      totalCompleted: completedAgendas,
      totalDraft: draftAgendas,
      totalAgendas,
      classStats,
      statusStats,
      monthlyStats,
      recentAgendas
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

    // Add date range filter if provided
    const fromDate = req.query.fromDate as string;
    const toDate = req.query.toDate as string;
    
    if (fromDate || toDate) {
      matchFilter.draftDate = {};
      
      if (fromDate) {
        const from = new Date(fromDate);
        from.setHours(0, 0, 0, 0);
        matchFilter.draftDate.$gte = from;
      }
      
      if (toDate) {
        const to = new Date(toDate);
        to.setHours(23, 59, 59, 999);
        matchFilter.draftDate.$lte = to;
      }
    }

    const meetingClasses = await Agenda.distinct('meetingClass', matchFilter);
    const locations = await Agenda.distinct('location', matchFilter);
    const creators = await Agenda.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$createdBy'
        }
      },
      { $limit: 50 }
    ]);

    // Get creator details - FIXED: Changed from 'firstName lastName' to 'name'
    const creatorIds = creators.map(c => c._id).filter((id): id is mongoose.Types.ObjectId => id != null);
    const creatorDetails = await User.find(
      { _id: { $in: creatorIds } },
      '_id name email role'  // ← FIXED HERE
    );

    // Get all students for contributor selection
    const allStudents = await Student.find({}, '_id firstName middleName lastName gender gibyGubayeId phone email')
      .sort({ firstName: 1 })
      .limit(100);

    successResponse(res, {
      meetingClasses: meetingClasses.filter(Boolean).sort(),
      locations: locations.filter(Boolean).sort(),
      creators: creatorDetails,
      allStudents
    }, 'Filter options retrieved successfully');
  } catch (error: any) {
    console.error('Error fetching filter options:', error);
    errorResponse(res, error.message, 500);
  }
};

// Get agendas for approval queue
export const getApprovalQueue = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string || '';
    const meetingClass = req.query.meetingClass as string || '';
    const location = req.query.location as string || '';
    const creator = req.query.creator as string || '';
    const fromDate = req.query.fromDate as string || '';
    const toDate = req.query.toDate as string || '';
    const sortBy = req.query.sortBy as string || 'draftDate';
    const sortOrder = req.query.sortOrder as string === 'asc' ? 1 : -1;

    const skip = (page - 1) * limit;

    // Build filter object for pending agendas
    const filter: any = { status: 'pending' };
    
    if (search) {
      filter.$or = [
        { meetingClass: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
        { 'agendaTitles.title': { $regex: search, $options: 'i' } }
      ];
    }
    
    if (meetingClass) {
      filter.meetingClass = meetingClass;
    }
    
    if (location) {
      filter.location = { $regex: location, $options: 'i' };
    }
    
    if (creator && mongoose.Types.ObjectId.isValid(creator)) {
      filter.createdBy = creator;
    }

    // Date range filtration - Filter by draftDate
    if (fromDate || toDate) {
      filter.draftDate = {};
      
      if (fromDate) {
        // Parse fromDate and set to start of day
        const from = new Date(fromDate);
        from.setHours(0, 0, 0, 0);
        filter.draftDate.$gte = from;
      }
      
      if (toDate) {
        // Parse toDate and set to end of day
        const to = new Date(toDate);
        to.setHours(23, 59, 59, 999);
        filter.draftDate.$lte = to;
      }
    }

    // Sort object
    const sort: any = {};
    sort[sortBy] = sortOrder;

    const agendas = await Agenda.find(filter)
      .populate('createdBy', 'name email role')  // ← FIXED HERE
      .populate('draftContributors', 'firstName middleName lastName gender gibyGubayeId phone email')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const totalAgendas = await Agenda.countDocuments(filter);
    const totalPages = Math.ceil(totalAgendas / limit);

    successResponse(res, {
      agendas,
      pagination: {
        currentPage: page,
        totalPages,
        totalAgendas,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    }, 'Approval queue retrieved successfully');
  } catch (error: any) {
    console.error('Error fetching approval queue:', error);
    errorResponse(res, error.message, 500);
  }
};

// Get students by IDs endpoint
export const getStudentsByIds = async (req: Request, res: Response) => {
  try {
    const { studentIds } = req.body;
    
    if (!Array.isArray(studentIds)) {
      return errorResponse(res, 'studentIds must be an array', 400);
    }

    // Filter valid ObjectIds
    const validIds = studentIds.filter((id: string) => mongoose.Types.ObjectId.isValid(id));
    
    if (validIds.length === 0) {
      return successResponse(res, [], 'No valid student IDs provided');
    }

    // Fetch students by IDs
    const students = await Student.find(
      { _id: { $in: validIds } },
      '_id firstName middleName lastName gender gibyGubayeId phone email'
    );

    successResponse(res, students, 'Students retrieved successfully');
  } catch (error: any) {
    console.error('Error fetching students by IDs:', error);
    errorResponse(res, error.message, 500);
  }
};

// Get users by IDs endpoint
export const getUsersByIds = async (req: Request, res: Response) => {
  try {
    const { userIds } = req.body;
    
    if (!Array.isArray(userIds)) {
      return errorResponse(res, 'userIds must be an array', 400);
    }

    // Filter valid ObjectIds
    const validIds = userIds.filter((id: string) => mongoose.Types.ObjectId.isValid(id));
    
    if (validIds.length === 0) {
      return successResponse(res, [], 'No valid user IDs provided');
    }

    // Fetch users by IDs
    const users = await User.find(
      { _id: { $in: validIds } },
      '_id name email role'
    );

    successResponse(res, users, 'Users retrieved successfully');
  } catch (error: any) {
    console.error('Error fetching users by IDs:', error);
    errorResponse(res, error.message, 500);
  }
};