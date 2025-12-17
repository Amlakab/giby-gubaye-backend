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
import feedbackRoutes from './routes/feedback';
import { connectDB } from './config/database';
import { errorHandler } from './middleware/errorHandler';
import path from 'path'; // IMPORTANT: Add this import
import fs from 'fs'; // Add this import for file system operations

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

// FIX: Create uploads directory if it doesn't exist
const createUploadsDirectory = () => {
  // Get the project root directory (where package.json is)
  const projectRoot = process.cwd();
  const uploadsDir = path.join(projectRoot, 'public', 'uploads');
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('📁 Created uploads directory:', uploadsDir);
  }
  
  return uploadsDir;
};

// Initialize uploads directory
createUploadsDirectory();

// FIX: Serve static files from the correct location
// Use the same path that studentRoutes.ts uses
const uploadsPath = path.join(process.cwd(), 'public', 'uploads');
app.use('/uploads', express.static(uploadsPath));

// Debug middleware for static files (optional - remove in production)
app.use('/uploads', (req, res, next) => {
  console.log(`📁 Static file request: ${req.url}`);
  console.log(`📁 Looking in: ${uploadsPath}`);
  next();
});

// Routes
app.use('/api/user', userRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/agent', agentRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/accountants', accountantRoutes);


// Enhanced health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'Server is running',
    cors: `Restricted to: ${CLIENT_URL}`,
    uploadsPath: uploadsPath,
    projectRoot: process.cwd(),
    timestamp: new Date().toISOString(),
    origin: req.headers.origin || 'Unknown'
  });
});

// CORS test endpoint
app.get('/api/cors-test', (req, res) => {
  const origin = req.headers.origin;
  const isAllowed = origin === CLIENT_URL;
  
  res.status(200).json({ 
    message: isAllowed ? 'CORS is working! Origin allowed.' : 'CORS: Origin not allowed',
    yourOrigin: origin,
    allowedOrigin: CLIENT_URL,
    allowed: isAllowed,
    timestamp: new Date().toISOString()
  });
});

// Test file serving endpoint
app.get('/api/test-upload', (req, res) => {
  const testFilePath = path.join(uploadsPath, 'test.txt');
  
  // Create a test file
  fs.writeFileSync(testFilePath, 'This is a test file for uploads directory.');
  
  res.json({
    message: 'Test file created',
    testFilePath: testFilePath,
    testFileUrl: 'http://localhost:3001/uploads/test.txt',
    uploadsPath: uploadsPath
  });
});

// WebSocket endpoint for clients that need raw WebSocket
app.get('/ws', (req, res) => {
  res.status(400).json({ error: 'Use Socket.io client instead' });
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
  console.log(`📁 Uploads path: ${uploadsPath}`);
  console.log(`📁 Project root: ${process.cwd()}`);
  console.log(`✅ Health check: http://localhost:${PORT}/api/health`);
  console.log(`✅ CORS test: http://localhost:${PORT}/api/cors-test`);
  console.log(`✅ Upload test: http://localhost:${PORT}/api/test-upload`);
  console.log(`📱 Mobile apps must connect from: ${CLIENT_URL}`);
});