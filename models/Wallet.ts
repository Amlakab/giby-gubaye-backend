import mongoose, { Document, Schema } from 'mongoose';

export interface IWallet extends Document {
  wallet: number;
  totalDeposit: number;
  totalWithdrawal: number;
  createdAt: Date;
  updatedAt: Date;
}

const walletSchema = new Schema<IWallet>({
  wallet: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
  },
  totalDeposit: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
  },
  totalWithdrawal: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
  },
}, {
  timestamps: true,
});

// Create or get the single wallet instance
walletSchema.statics.getWallet = async function() {
  let wallet = await this.findOne();
  if (!wallet) {
    wallet = new this({
      wallet: 0,
      totalDeposit: 0,
      totalWithdrawal: 0
    });
    await wallet.save();
  }
  return wallet;
};

export default mongoose.model<IWallet>('Wallet', walletSchema);