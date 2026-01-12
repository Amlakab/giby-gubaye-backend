import mongoose, { Schema, Document } from 'mongoose';

export interface IFamilyChild {
  student: mongoose.Types.ObjectId;
  relationship: 'son' | 'daughter';
  birthOrder?: number;
  addedAt: Date;
}

export interface IFamilyMember {
  father: {
    student: mongoose.Types.ObjectId;
    phone?: string;
    email?: string;
    occupation?: string;
  };
  mother: {
    student: mongoose.Types.ObjectId;
    phone?: string;
    email?: string;
    occupation?: string;
  };
  children: IFamilyChild[];
  createdAt: Date;
}

export interface IGrandParent {
  title: string;
  grandFather?: mongoose.Types.ObjectId;
  grandMother?: mongoose.Types.ObjectId;
  families: IFamilyMember[];
}

export interface IFamily extends Document {
  title: string;
  location: string;
  batch: string;
  allowOtherBatches: boolean; // New field for allowing children from other batches
  familyDate: Date;
  familyLeader: mongoose.Types.ObjectId;
  familyCoLeader: mongoose.Types.ObjectId;
  familySecretary: mongoose.Types.ObjectId;
  grandParents: IGrandParent[];
  status: 'current' | 'finished';
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const FamilyChildSchema = new Schema<IFamilyChild>({
  student: {
    type: Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  relationship: {
    type: String,
    enum: ['son', 'daughter'],
    required: true
  },
  birthOrder: {
    type: Number,
    min: 1
  },
  addedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const FamilyMemberSchema = new Schema<IFamilyMember>({
  father: {
    student: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: true
    },
    phone: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true
    },
    occupation: {
      type: String,
      trim: true
    }
  },
  mother: {
    student: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: true
    },
    phone: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true
    },
    occupation: {
      type: String,
      trim: true
    }
  },
  children: {
    type: [FamilyChildSchema],
    default: []
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const GrandParentSchema = new Schema<IGrandParent>({
  title: {
    type: String,
    required: true,
    trim: true
  },
  grandFather: {
    type: Schema.Types.ObjectId,
    ref: 'Student'
  },
  grandMother: {
    type: Schema.Types.ObjectId,
    ref: 'Student'
  },
  families: {
    type: [FamilyMemberSchema],
    default: []
  }
}, { _id: false });

const FamilySchema = new Schema<IFamily>({
  title: {
    type: String,
    required: [true, 'Family title is required'],
    trim: true,
    unique: true
  },
  location: {
    type: String,
    required: [true, 'Location is required'],
    trim: true
  },
  batch: {
    type: String,
    required: [true, 'Batch is required'],
    trim: true
  },
  allowOtherBatches: {
    type: Boolean,
    default: false
  },
  familyDate: {
    type: Date,
    required: [true, 'Family date is required'],
    default: Date.now
  },
  familyLeader: {
    type: Schema.Types.ObjectId,
    ref: 'Student',
    required: [true, 'Family leader is required']
  },
  familyCoLeader: {
    type: Schema.Types.ObjectId,
    ref: 'Student',
    required: [true, 'Family co-leader is required']
  },
  familySecretary: {
    type: Schema.Types.ObjectId,
    ref: 'Student',
    required: [true, 'Family secretary is required']
  },
  grandParents: {
    type: [GrandParentSchema],
    default: []
  },
  status: {
    type: String,
    enum: ['current', 'finished'],
    default: 'current'
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
FamilySchema.index({ title: 1 });
FamilySchema.index({ status: 1 });
FamilySchema.index({ createdBy: 1 });
FamilySchema.index({ familyDate: -1 });
FamilySchema.index({ batch: 1 });

// Virtuals for populating student references
FamilySchema.virtual('leader', {
  ref: 'Student',
  localField: 'familyLeader',
  foreignField: '_id',
  justOne: true,
  options: { select: 'firstName middleName lastName gender gibyGubayeId phone email batch photo photoData' }
});

FamilySchema.virtual('coLeader', {
  ref: 'Student',
  localField: 'familyCoLeader',
  foreignField: '_id',
  justOne: true,
  options: { select: 'firstName middleName lastName gender gibyGubayeId phone email batch photo photoData' }
});

FamilySchema.virtual('secretary', {
  ref: 'Student',
  localField: 'familySecretary',
  foreignField: '_id',
  justOne: true,
  options: { select: 'firstName middleName lastName gender gibyGubayeId phone email batch photo photoData' }
});

FamilySchema.virtual('creator', {
  ref: 'User',
  localField: 'createdBy',
  foreignField: '_id',
  justOne: true,
  options: { select: 'name email role' }
});

// Validation for at least one grand parent (grandFather or grandMother)
GrandParentSchema.pre('validate', function(next) {
  if (!this.grandFather && !this.grandMother) {
    this.invalidate('grandFather', 'At least one of grandFather or grandMother is required');
    this.invalidate('grandMother', 'At least one of grandFather or grandMother is required');
  }
  next();
});

// REMOVED DUPLICATE VALIDATION - We'll handle it in controller
// This was causing the error because it was checking wrong count

export default mongoose.model<IFamily>('Family', FamilySchema);