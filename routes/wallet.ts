import express, { Request, Response } from 'express';
import Wallet from '../models/Wallet';
import Transaction from '../models/Transaction';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Get wallet stats
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const wallet = await Wallet.findOne();
    
    if (!wallet) {
      // Create default wallet if not exists
      const newWallet = new Wallet({
        wallet: 0,
        totalDeposit: 0,
        totalWithdrawal: 0
      });
      await newWallet.save();
      return res.json({ success: true, data: newWallet });
    }
    
    res.json({ success: true, data: wallet });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get wallet stats for overview
router.get('/stats', authenticate, async (req: Request, res: Response) => {
  try {
    const wallet = await Wallet.findOne();
    
    if (!wallet) {
      return res.json({ 
        success: true, 
        data: {
          wallet: 0,
          totalDeposit: 0,
          totalWithdrawal: 0
        }
      });
    }
    
    // Calculate recent transactions
    const recentTransactions = await Transaction.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('userId', 'phone name');
    
    // Calculate pending counts
    const pendingDeposits = await Transaction.countDocuments({ 
      type: 'deposit', 
      status: 'pending' 
    });
    
    const pendingWithdrawals = await Transaction.countDocuments({ 
      type: 'withdrawal', 
      status: 'pending' 
    });
    
    res.json({ 
      success: true, 
      data: {
        wallet: wallet.wallet,
        totalDeposit: wallet.totalDeposit,
        totalWithdrawal: wallet.totalWithdrawal,
        pendingDeposits,
        pendingWithdrawals,
        recentTransactions
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update wallet (admin only)
router.put('/update', authenticate, async (req: Request, res: Response) => {
  try {
    const { wallet, totalDeposit, totalWithdrawal } = req.body;
    
    // Check if user is admin
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }
    
    const walletDoc = await Wallet.findOne();
    
    if (!walletDoc) {
      const newWallet = new Wallet({
        wallet: wallet || 0,
        totalDeposit: totalDeposit || 0,
        totalWithdrawal: totalWithdrawal || 0
      });
      await newWallet.save();
      return res.json({ success: true, data: newWallet });
    }
    
    if (wallet !== undefined) walletDoc.wallet = wallet;
    if (totalDeposit !== undefined) walletDoc.totalDeposit = totalDeposit;
    if (totalWithdrawal !== undefined) walletDoc.totalWithdrawal = totalWithdrawal;
    
    await walletDoc.save();
    
    res.json({ success: true, data: walletDoc });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Add to wallet (for completed deposits)
router.post('/deposit', authenticate, async (req: Request, res: Response) => {
  try {
    const { amount } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid amount' });
    }
    
    const wallet = await Wallet.findOne();
    
    if (!wallet) {
      const newWallet = new Wallet({
        wallet: amount,
        totalDeposit: amount,
        totalWithdrawal: 0
      });
      await newWallet.save();
      return res.json({ success: true, data: newWallet });
    }
    
    wallet.wallet += amount;
    wallet.totalDeposit += amount;
    
    await wallet.save();
    
    res.json({ success: true, data: wallet });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Withdraw from wallet (for completed withdrawals)
router.post('/withdraw', authenticate, async (req: Request, res: Response) => {
  try {
    const { amount } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid amount' });
    }
    
    const wallet = await Wallet.findOne();
    
    if (!wallet) {
      return res.status(404).json({ success: false, message: 'Wallet not found' });
    }
    
    if (wallet.wallet < amount) {
      return res.status(400).json({ success: false, message: 'Insufficient balance' });
    }
    
    wallet.wallet -= amount;
    wallet.totalWithdrawal += amount;
    
    await wallet.save();
    
    res.json({ success: true, data: wallet });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;