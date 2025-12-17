import mongoose, { Document, Schema } from 'mongoose';

export interface IJob extends Document {
  studentId: mongoose.Types.ObjectId;
  class: string;
  sub_class?: string;
  type?: 'member' | 'leader' | 'sub_leader' | 'Secretary';
  background?: string;
  createdAt: Date;
  updatedAt: Date;
}

const jobSchema = new Schema<IJob>({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
  },
  class: {
    type: String,
    required: true,
    trim: true,
  },
  sub_class: {
    type: String,
    trim: true,
  },
  type: {
    type: String,
    enum: ['member', 'leader', 'sub_leader', 'Secretary'],  // restrict values
    trim: true,
    required: true,  // make it required if needed
  },
  background: {
    type: String,
    trim: true,
  },
}, {
  timestamps: true,
});

// Compound index to ensure one student cannot have duplicate class
jobSchema.index({ studentId: 1, class: 1 }, { unique: true });

// Index for filtering by class
jobSchema.index({ class: 1 });
jobSchema.index({ createdAt: -1 });

export default mongoose.model<IJob>('Job', jobSchema);
