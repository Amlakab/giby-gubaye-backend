import mongoose, { Document, Schema } from 'mongoose';

export interface IAgendaDiscussion {
  question: string;
  answer: string;
  summary: string;
  discussedAt: Date;
}

export interface IAgendaTitle {
  title: string;
  discussions: IAgendaDiscussion[];
}

export interface IAgenda extends Document {
  meetingClass: string;
  location: string;
  draftContributors: mongoose.Types.ObjectId[];
  agendaTitles: IAgendaTitle[];
  generalMeetingSummary?: string;
  meetingContributors: mongoose.Types.ObjectId[];
  
  // Status fields
  status: 'draft' | 'pending' | 'approved' | 'completed';
  draftDate: Date;
  meetingDate?: Date;
  
  // User references
  createdBy: mongoose.Types.ObjectId;
  approvedBy?: mongoose.Types.ObjectId;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const agendaDiscussionSchema = new Schema<IAgendaDiscussion>({
  question: {
    type: String,
    required: true,
    trim: true
  },
  answer: {
    type: String,
    required: true,
    trim: true
  },
  summary: {
    type: String,
    required: true,
    trim: true
  },
  discussedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const agendaTitleSchema = new Schema<IAgendaTitle>({
  title: {
    type: String,
    required: true,
    trim: true
  },
  discussions: {
    type: [agendaDiscussionSchema],
    default: []
  }
}, { _id: false });

const agendaSchema = new Schema<IAgenda>({
  meetingClass: {
    type: String,
    required: [true, 'Meeting class is required'],
    trim: true
  },
  location: {
    type: String,
    required: [true, 'Location is required'],
    trim: true
  },
  draftContributors: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  agendaTitles: {
    type: [agendaTitleSchema],
    required: true,
    validate: {
      validator: function(titles: IAgendaTitle[]) {
        return titles.length > 0;
      },
      message: 'At least one agenda title is required'
    }
  },
  generalMeetingSummary: {
    type: String,
    trim: true
  },
  meetingContributors: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  // Status fields
  status: {
    type: String,
    enum: ['draft', 'pending', 'approved', 'completed'],
    default: 'draft'
  },
  draftDate: {
    type: Date,
    default: Date.now
  },
  meetingDate: {
    type: Date
  },
  
  // User references
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Creator is required']
  },
  approvedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
agendaSchema.index({ status: 1 });
agendaSchema.index({ createdBy: 1 });
agendaSchema.index({ draftDate: -1 });
agendaSchema.index({ meetingDate: -1 });
agendaSchema.index({ approvedBy: 1 });

// Virtual for creator information
agendaSchema.virtual('creator', {
  ref: 'User',
  localField: 'createdBy',
  foreignField: '_id',
  justOne: true
});

// Virtual for approver information
agendaSchema.virtual('approver', {
  ref: 'User',
  localField: 'approvedBy',
  foreignField: '_id',
  justOne: true
});

// Virtual for draft contributors details
agendaSchema.virtual('draftContributorsDetails', {
  ref: 'User',
  localField: 'draftContributors',
  foreignField: '_id'
});

// Virtual for meeting contributors details
agendaSchema.virtual('meetingContributorsDetails', {
  ref: 'User',
  localField: 'meetingContributors',
  foreignField: '_id'
});

// Pre-save middleware
agendaSchema.pre('save', function(next) {
  // Set draftDate when status changes to pending
  if (this.isModified('status') && this.status === 'pending' && !this.draftDate) {
    this.draftDate = new Date();
  }
  
  // Set meetingDate when status changes to completed
  if (this.isModified('status') && this.status === 'completed' && !this.meetingDate) {
    this.meetingDate = new Date();
  }
  
  next();
});

export default mongoose.model<IAgenda>('Agenda', agendaSchema);