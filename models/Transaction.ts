import mongoose, { Document, Schema } from 'mongoose';

// Update your Transaction model
export interface ITransaction extends Document {
  userId: Schema.Types.ObjectId;
  class: string;
  type: 'deposit' | 'withdrawal' | 'game_purchase' | 'winning';
  amount: number;
  amountInString?: string;
  status: 'pending' | 'approved' | 'completed' | 'confirmed' | 'failed';
  reference: string;
  description: string;
  transactionId?: string;
  senderPhone?: string;
  senderName?: string;
  receiverPhone?: string;
  receiverName?: string;
  method?: 'telebirr' | 'cbe' | 'cash';
  reason?: string;
  metadata?: any;
  approvedBy?: string;
  completedBy?: string;
  confirmedBy?: string;
  createdAt: Date;
  approvedAt?: Date;
  completedAt?: Date;
  confirmedAt?: Date;
  updatedAt: Date;
}

const transactionSchema = new Schema<ITransaction>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  class: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    required: true,
    enum: ['deposit', 'withdrawal', 'game_purchase', 'winning'],
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  amountInString: {
    type: String,
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'approved', 'confirmed'],
    default: 'pending',
  },
  reference: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  transactionId: {
    type: String,
    sparse: true,
  },
  senderPhone: {
    type: String,
  },
  senderName: {
    type: String,
  },
  receiverPhone: {
    type: String,
  },
  receiverName: {
    type: String,
  },
  method: {
    type: String,
    enum: ['telebirr', 'cbe', 'cash'],
  },
  reason: {
    type: String,
  },
  metadata: {
    type: Schema.Types.Mixed,
  },
  approvedBy: {
    type: String,
  },
  completedBy: {
    type: String,
  },
  confirmedBy: {
    type: String,
  },
  approvedAt: {
    type: Date,
  },
  completedAt: {
    type: Date,
  },
  confirmedAt: {
    type: Date,
  },
}, {
  timestamps: true,
});

// Index for faster queries
transactionSchema.index({ userId: 1, type: 1 });
transactionSchema.index({ reference: 1 });
transactionSchema.index({ createdAt: 1 });
transactionSchema.index({ status: 1 });

export default mongoose.model<ITransaction>('Transaction', transactionSchema);