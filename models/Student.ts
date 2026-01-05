import mongoose, { Document, Schema } from 'mongoose';

export interface IStudent extends Document {
  gibyGubayeId: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  motherName: string;
  phone: string;
  email: string;
  gender: 'male' | 'female';
  block: string;
  dorm: string;
  university: string;
  college: string;
  department: string;
  batch: string;
  region: string;
  zone: string;
  wereda: string;
  kebele: string;
  church: string;
  authority: string;
  job: string;
  motherTongue: string;
  additionalLanguages: string[];
  attendsCourse: boolean;
  courseName?: string;
  courseChurch?: string;
  numberOfJob: number;
  dateOfBirth: Date;
  emergencyContact: string;
  photo?: string; // Keep for frontend compatibility
  photoData?: {
    data: Buffer;
    contentType: string;
    fileName: string;
  }; // Store actual image data
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const studentSchema = new Schema<IStudent>({
  gibyGubayeId: {
    type: String,
    unique: true,
    required: true,
    index: true
  },
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
  },
  middleName: {
    type: String,
    trim: true,
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
  },
  motherName: {
    type: String,
    required: [true, 'Mother name is required'],
    trim: true,
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    unique: true,
    trim: true,
    match: [/^09\d{8}$/, 'Please enter a valid Ethiopian phone number (09XXXXXXXX)']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address']
  },
  gender: {
    type: String,
    enum: ['male', 'female'],
    required: [true, 'Gender is required']
  },
  block: {
    type: String,
    required: [true, 'Block is required'],
    trim: true,
  },
  dorm: {
    type: String,
    required: [true, 'Dorm is required'],
    trim: true,
  },
  university: {
    type: String,
    required: [true, 'University is required'],
    trim: true,
  },
  college: {
    type: String,
    required: [true, 'College is required'],
    trim: true,
  },
  department: {
    type: String,
    required: [true, 'Department is required'],
    trim: true,
  },
  batch: {
    type: String,
    required: [true, 'Batch is required'],
    trim: true,
  },
  region: {
    type: String,
    required: [true, 'Region is required'],
    trim: true,
  },
  zone: {
    type: String,
    required: [true, 'Zone is required'],
    trim: true,
  },
  wereda: {
    type: String,
    required: [true, 'Wereda is required'],
    trim: true,
  },
  kebele: {
    type: String,
    required: [true, 'Kebele is required'],
    trim: true,
  },
  church: {
    type: String,
    required: [true, 'Church is required'],
    trim: true,
  },
  authority: {
    type: String,
    required: [true, 'Authority is required'],
    trim: true,
  },
  job: {
    type: String,
    required: [true, 'Job is required'],
    trim: true,
  },
  motherTongue: {
    type: String,
    required: [true, 'Mother tongue is required'],
    trim: true,
  },
  additionalLanguages: {
    type: [String],
    default: [],
  },
  attendsCourse: {
    type: Boolean,
    default: false,
  },
  courseName: {
    type: String,
    trim: true,
  },
  courseChurch: {
    type: String,
    trim: true,
  },
  numberOfJob: {
    type: Number,
    default: 0,
  },
  dateOfBirth: {
    type: Date,
    required: [true, 'Date of birth is required'],
  },
  emergencyContact: {
    type: String,
    required: [true, 'Emergency contact is required'],
    trim: true,
    match: [/^09\d{8}$/, 'Please enter a valid Ethiopian phone number (09XXXXXXXX)']
  },
  photo: {
    type: String,
    default: ''
  },
  photoData: {
    data: Buffer,
    contentType: String,
    fileName: String
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
});

// Indexes for better query performance
studentSchema.index({ phone: 1 }, { unique: true });
studentSchema.index({ email: 1 }, { unique: true });
studentSchema.index({ university: 1 });
studentSchema.index({ college: 1 });
studentSchema.index({ department: 1 });
studentSchema.index({ batch: 1 });
studentSchema.index({ region: 1 });
studentSchema.index({ isActive: 1 });

// Virtual for age calculation
studentSchema.virtual('age').get(function() {
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
});

// Ensure virtuals are included in JSON output
studentSchema.set('toJSON', { virtuals: true });
studentSchema.set('toObject', { virtuals: true });

export default mongoose.model<IStudent>('Student', studentSchema);