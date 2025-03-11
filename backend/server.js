/**
 * server.js - Production-Grade Safaricom Daraja Integration
 * 
 * This file sets up the Express server for handling MPesa transactions securely.
 * It includes:
 * - Secure HTTPS setup (for production)
 * - Environment variable validation
 * - Database connection with retry logic
 * - MPesa API routes with rate limiting
 * - Email and authentication routes
 * - Middleware for security and error handling
 */

const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const mongoose = require('mongoose');
const https = require('https');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const crypto = require('crypto');
const adminRoutes = require('./routes/adminRoutes');

// Load environment variables
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: './.env' });
}

// Validate required environment variables
const requiredEnvVars = [
  'MONGO_URI',
  'JWT_SECRET',
  'MPESA_CONSUMER_KEY',
  'MPESA_CONSUMER_SECRET',
  'MPESA_SHORT_CODE',
  'MPESA_PASSKEY',
  'MPESA_CALLBACK_URL',
  'MPESA_API_BASE'
];

requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    console.error(`🔥 Critical: Missing ${varName} environment variable`);
    process.exit(1);
  }
});

if (process.env.NODE_ENV === 'production') {
  if (!process.env.SSL_KEY_PATH || !process.env.SSL_CERT_PATH || !process.env.SSL_CA_PATH) {
    console.error("❌ Missing SSL certificates! Check your environment variables.");
    process.exit(1);
  }
}

const app = express();

// Security Middleware
app.use(helmet());

// Updated CORS Configuration
app.use(cors({
  origin: ['http://localhost:5173'], // Allow frontend
  credentials: true, // Allow cookies and authorization headers
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later'
});

// JSON Middleware
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf.toString();
  },
  limit: '1mb'
}));

// Database Connection
const connectDB = async (retries = 5) => {
  while (retries) {
    try {
      await mongoose.connect(process.env.MONGO_URI, {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000
      });
      console.log('✅ MongoDB Connected with Production Settings');
      return;
    } catch (err) {
      console.error(`❌ Database Connection Failure (${retries} retries left):`, err.message);
      retries--;
      if (retries === 0) process.exit(1);
      await new Promise(res => setTimeout(res, 5000));
    }
  }
};
connectDB();

// Store MPesa config
app.locals.mpesaConfig = {
  shortCode: process.env.MPESA_SHORT_CODE,
  passkey: process.env.MPESA_PASSKEY,
  consumerSecret: process.env.MPESA_CONSUMER_SECRET,
  baseUrl: process.env.MPESA_API_BASE
};

// Routes
const mpesaRoutes = require('./routes/mpesaRoutes');
const emailRoutes = require('./routes/emailRoutes');
const authRoutes = require('./routes/authRoutes');

app.use('/api/v1/mpesa', apiLimiter, mpesaRoutes);
app.use('/api/v1/email', emailRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/admin', adminRoutes);

// Validate MPesa Callback Signature
const validateMpesaCallback = (req, res, next) => {
  const signature = crypto.createHmac('sha256', process.env.MPESA_CONSUMER_SECRET)
    .update(req.rawBody)
    .digest('base64');
  if (signature !== req.headers['x-mpesa-signature']) {
    console.warn('⚠️ Invalid MPesa Callback Signature from:', req.ip);
    return res.status(403).json({ ResultCode: 1, ResultDesc: 'Invalid signature' });
  }
  next();
};

// Global Error Handling
app.use((err, req, res, next) => {
  console.error('🚨 Global Error:', {
    path: req.path,
    method: req.method,
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack
  });

  if (req.path.includes('mpesa/callback')) {
    return res.status(200).json({ ResultCode: 1, ResultDesc: 'Service unavailable' });
  }

  res.status(err.statusCode || 500).json({
    status: 'error',
    message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message
  });
});

// Start the Server
let server;
if (process.env.NODE_ENV === 'production') {
  const sslOptions = {
    key: fs.readFileSync(process.env.SSL_KEY_PATH),
    cert: fs.readFileSync(process.env.SSL_CERT_PATH),
    ca: fs.readFileSync(process.env.SSL_CA_PATH)
  };
  server = https.createServer(sslOptions, app).listen(443, () => {
    console.log('🔒 HTTPS server running on port 443');
  });
} else {
  server = app.listen(process.env.PORT || 5000, () => {
    console.log(`🚀 Development server running on port ${process.env.PORT || 5000}`);
  });
}

// Graceful Shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received - closing server');
  server.close(() => {
    console.log('✅ Server shutting down gracefully...');
    mongoose.connection.close(false, () => {
      console.log('📦 MongoDB connection closed');
      process.exit(0);
    });
  });
});

// Updated handleSubmit function
const handleSubmit = async (e) => {
  e.preventDefault();
  if (!validateForm()) return;

  try {
    const response = await fetch('http://localhost:5000/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });

    const data = await response.json();
    console.log("Server response:", data); // Log server response

    if (!response.ok) throw new Error(data.message || 'Registration failed');

    setStatusMessage({ text: 'Registration successful! Redirecting...', type: 'success' });
    setTimeout(() => navigate('/login'), 2000);
  } catch (error) {
    console.error("Error:", error.message);
    setStatusMessage({ text: error.message, type: 'error' });
  }
};
