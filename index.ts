import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { createServer } from 'http';
import { Server } from 'socket.io';
import authRoutes from './routes/auth';
import accountantRoutes from './routes/accountant';
import agentRoutes from './routes/agent';
import userRoutes from './routes/user';
import studentRoutes from './routes/studentRoutes';
import jobRoutes from './routes/jobRoutes';
import blogRoutes from './routes/blogRoutes';
import agendaRoutes from './routes/agendaRoutes';
import transactionRoutes from './routes/transactions';
import walletRoutes from './routes/wallet';
import feedbackRoutes from './routes/feedback';
import familyRoutes from './routes/familyRoutes';
import { connectDB } from './config/database';
import { errorHandler } from './middleware/errorHandler';
import { serveStudentPhoto } from './controllers/studentController';
import { serveBlogImage } from './controllers/blogController';

dotenv.config();

const app = express();
const server = createServer(app);

// Get client URL from environment variables
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

// Socket.io setup with specific origin
const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["*"]
  },
  path: '/socket.io/',
  transports: ['websocket', 'polling']
});

// Middleware - Use CLIENT_URL from environment
app.use(cors({
  origin: CLIENT_URL,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin", "Access-Control-Request-Method", "Access-Control-Request-Headers", "*"]
}));

// Handle preflight requests for ALL routes
app.options('*', cors({
  origin: CLIENT_URL,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["*"]
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// BACKWARD COMPATIBILITY ROUTES - Keep frontend URLs working
// These routes intercept the old upload URLs and serve images from database
app.get('/uploads/students/:filename', serveStudentPhoto);
app.get('/uploads/blogs/:filename', serveBlogImage);

// Routes
app.use('/api/user', userRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/blogs', blogRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/agendas', agendaRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/agent', agentRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/accountants', accountantRoutes);
app.use('/api/families', familyRoutes);

// Enhanced health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'Server is running',
    cors: `Restricted to: ${CLIENT_URL}`,
    timestamp: new Date().toISOString(),
    origin: req.headers.origin || 'Unknown',
    imageStorage: 'database',
    compatibility: 'frontend URLs unchanged'
  });
});

// Error handling middleware
app.use(errorHandler);

// Connect to database
connectDB();

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 CORS: Restricted to ${CLIENT_URL}`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`💾 Images stored in: MongoDB Database`);
  console.log(`🔗 Frontend compatibility: URLs unchanged`);
  console.log(`✅ Health check: http://localhost:${PORT}/api/health`);
  console.log(`📱 Mobile apps must connect from: ${CLIENT_URL}`);
});