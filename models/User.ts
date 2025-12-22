import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  gibyGubayeId: string;
  name: string;
  email: string;
  phone: string;
  background?: string;
  studentId: mongoose.Types.ObjectId;
  password: string;
  role:
    | 'user'
    | 'disk-user'
    | 'spinner-user'
    | 'accountant'
    | 'admin'
    | 'Abalat-Guday'
    | 'Mezmur'
    | 'Timhrt'
    | 'Muyana-Terado'
    | 'Priesedant'
    | 'Vice-Priesedant'
    | 'Secretary'
    | 'Bachna-Department'
    | 'Audite'
    | 'Limat';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    gibyGubayeId: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
    },
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      match: [/^09\d{8}$/, 'Please enter a valid Ethiopian phone number'],
    },
    background: {
      type: String,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    role: {
      type: String,
      enum: [
        'user',
        'disk-user',
        'spinner-user',
        'accountant',
        'admin',
        'Abalat-Guday',
        'Mezmur',
        'Timhrt',
        'Muyana-Terado',
        'Priesedant',
        'Vice-Priesedant',
        'Secretary',
        'Bachna-Department',
        'Audite',
        'Limat',
      ],
      default: 'user',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as any);
  }
});

userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model<IUser>('User', userSchema);