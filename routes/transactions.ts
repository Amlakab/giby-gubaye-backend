import express, { Request, Response } from 'express';
import Transaction from '../models/Transaction';
import Wallet from '../models/Wallet';
import User from '../models/User';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Helper function to convert number to words (for amountInString)
const numberToWords = (num: number): string => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  if (num === 0) return 'Zero';
  
  const convertBelowThousand = (n: number): string => {
    if (n === 0) return '';
    
    let result = '';
    
    if (n >= 100) {
      result += ones[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    
    if (n >= 20) {
      result += tens[Math.floor(n / 10)] + ' ';
      n %= 10;
    } else if (n >= 10) {
      result += teens[n - 10] + ' ';
      return result.trim();
    }
    
    if (n > 0) {
      result += ones[n] + ' ';
    }
    
    return result.trim();
  };
  
  let words = '';
  let number = Math.floor(num);
  
  if (number >= 1000) {
    words += convertBelowThousand(Math.floor(number / 1000)) + ' Thousand ';
    number %= 1000;
  }
  
  if (number > 0) {
    words += convertBelowThousand(number) + ' ';
  }
  
  return words.trim() + ' Birr';
};

// Get all transactions with filters
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const { 
      type, 
      status, 
      method, 
      search, 
      startDate, 
      endDate, 
      page = 1, 
      limit = 10 
    } = req.query;
    
    const query: any = {};
    
    if (type) query.type = type;
    if (status) query.status = status;
    if (method) query.method = method;
    
    if (search) {
      query.$or = [
        { reference: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { transactionId: { $regex: search, $options: 'i' } },
        { 'userId.phone': { $regex: search, $options: 'i' } },
        { senderPhone: { $regex: search, $options: 'i' } },
        { receiverPhone: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate as string);
      if (endDate) query.createdAt.$lte = new Date(endDate as string);
    }
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;
    
    const transactions = await Transaction.find(query)
      .populate('userId', 'phone name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);
    
    const total = await Transaction.countDocuments(query);
    
    res.json({
      success: true,
      data: transactions,
      pagination: {
        current: pageNum,
        total: Math.ceil(total / limitNum),
        count: transactions.length,
        totalRecords: total
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get transaction stats
router.get('/stats/overview', authenticate, async (req: Request, res: Response) => {
  try {
    const wallet = await Wallet.findOne();
    
    // Calculate stats from transactions
    const totalDepositsResult = await Transaction.aggregate([
      { $match: { type: 'deposit', status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    const totalWithdrawalsResult = await Transaction.aggregate([
      { $match: { type: 'withdrawal', status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    const totalWinningsResult = await Transaction.aggregate([
      { $match: { type: 'winning', status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    const totalGamePurchasesResult = await Transaction.aggregate([
      { $match: { type: 'game_purchase', status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    const pendingDeposits = await Transaction.countDocuments({ 
      type: 'deposit', 
      status: 'pending' 
    });
    
    const pendingWithdrawals = await Transaction.countDocuments({ 
      type: 'withdrawal', 
      status: 'pending' 
    });
    
    const totalTransactions = await Transaction.countDocuments();
    
    res.json({
      success: true,
      data: {
        totalTransactions,
        totalDeposits: totalDepositsResult[0]?.total || 0,
        totalWithdrawals: totalWithdrawalsResult[0]?.total || 0,
        totalWinnings: totalWinningsResult[0]?.total || 0,
        totalGamePurchases: totalGamePurchasesResult[0]?.total || 0,
        pendingDeposits,
        pendingWithdrawals,
        netBalance: wallet?.wallet || 0
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get transactions by user ID
router.get('/user/:userId', authenticate, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;
    
    const transactions = await Transaction.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);
    
    const total = await Transaction.countDocuments({ userId });
    
    res.json({
      success: true,
      data: transactions,
      pagination: {
        current: pageNum,
        total: Math.ceil(total / limitNum),
        count: transactions.length,
        totalRecords: total
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create transaction (deposit/withdrawal)
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const {
      userId,
      amount,
      type,
      method,
      transactionId,
      senderPhone,
      senderName,
      receiverPhone,
      receiverName,
      description
    } = req.body;
    
    if (!userId || !amount || !type || !method) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    
    // Get user from localStorage data
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Create transaction reference
    const reference = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    
    // Generate amount in string
    const amountInString = numberToWords(amount);
    
    const transaction = new Transaction({
      userId,
      class: user.role || 'user',
      type,
      amount,
      amountInString,
      status: 'pending',
      reference,
      description: description || `${type} via ${method}`,
      transactionId: method !== 'cash' ? transactionId : undefined,
      senderPhone: method !== 'cash' ? senderPhone : undefined,
      senderName: senderName || user.name,
      receiverPhone: method !== 'cash' ? receiverPhone : undefined,
      receiverName,
      method,
      metadata: {
        method,
        userPhone: user.phone,
        userName: user.name
      }
    });
    
    await transaction.save();
    
    res.json({
      success: true,
      data: transaction,
      message: 'Transaction created successfully'
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Approve transaction (for deposits/withdrawals)
router.put('/approve/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    const transaction = await Transaction.findById(id);
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }
    
    if (transaction.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Transaction is not pending' });
    }
    
    // Get user from localStorage or request
    const user = req.user || JSON.parse(req.headers['user'] as string || '{}');
    
    transaction.status = 'approved';
    transaction.approvedBy = user.name || user.username || 'Admin';
    transaction.approvedAt = new Date();
    if (reason) transaction.reason = reason;
    
    await transaction.save();
    
    res.json({
      success: true,
      data: transaction,
      message: 'Transaction approved successfully'
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Reject transaction
router.put('/reject/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    if (!reason) {
      return res.status(400).json({ success: false, message: 'Reason is required for rejection' });
    }
    
    const transaction = await Transaction.findById(id);
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }
    
    if (transaction.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Transaction is not pending' });
    }
    
    transaction.status = 'failed';
    transaction.reason = reason;
    
    await transaction.save();
    
    res.json({
      success: true,
      data: transaction,
      message: 'Transaction rejected successfully'
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Complete transaction (update wallet)
router.put('/complete/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { transactionId } = req.body;
    
    const transaction = await Transaction.findById(id);
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }
    
    if (transaction.status !== 'approved') {
      return res.status(400).json({ success: false, message: 'Transaction must be approved first' });
    }
    
    // For non-cash methods, require transactionId
    if (transaction.method !== 'cash' && transaction.type !== 'deposit' && !transactionId) {
      return res.status(400).json({ success: false, message: 'Transaction ID is required' });
    }
    
    // Get user from localStorage or request
    const user = req.user || JSON.parse(req.headers['user'] as string || '{}');
    
    // Update transaction
    transaction.status = 'completed';
    transaction.completedBy = user.name || user.username || 'Admin';
    transaction.completedAt = new Date();
    if (transactionId) transaction.transactionId = transactionId;
    
    // Update wallet
    const wallet = await Wallet.findOne();
    if (!wallet) {
      const newWallet = new Wallet({
        wallet: transaction.type === 'deposit' ? transaction.amount : -transaction.amount,
        totalDeposit: transaction.type === 'deposit' ? transaction.amount : 0,
        totalWithdrawal: transaction.type === 'withdrawal' ? transaction.amount : 0
      });
      await newWallet.save();
    } else {
      if (transaction.type === 'deposit') {
        wallet.wallet += transaction.amount;
        wallet.totalDeposit += transaction.amount;
      } else if (transaction.type === 'withdrawal') {
        wallet.wallet -= transaction.amount;
        wallet.totalWithdrawal += transaction.amount;
      }
      await wallet.save();
    }
    
    await transaction.save();
    
    res.json({
      success: true,
      data: transaction,
      message: 'Transaction completed successfully'
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Confirm withdrawal
router.put('/confirm/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const transaction = await Transaction.findById(id);
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }
    
    if (transaction.type !== 'withdrawal' || transaction.status !== 'completed') {
      return res.status(400).json({ success: false, message: 'Only completed withdrawals can be confirmed' });
    }
    
    // Get user from localStorage or request
    const user = req.user || JSON.parse(req.headers['user'] as string || '{}');
    
    transaction.status = 'confirmed';
    transaction.confirmedBy = user.name || user.username || 'Admin';
    transaction.confirmedAt = new Date();
    
    await transaction.save();
    
    res.json({
      success: true,
      data: transaction,
      message: 'Withdrawal confirmed successfully'
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;