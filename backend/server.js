/**
 * server.js - Production-Grade Safaricom Daraja Integration
 * 
 * This file sets up the Express server for handling MPesa transactions securely.
 * It includes:
 * - Secure HTTPS setup (for production)
 * - Environment variable validation
 * - Database connection with retry logic
 * - MPesa API routes with rate limiting
 * - Middleware for security and error handling
 */

const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const mongoose = require('mongoose');
const https = require('https'); // Secure HTTPS in production
const fs = require('fs');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet'); // Security headers
const crypto = require('crypto'); // Cryptography for MPesa signature validation

/**
 * Load environment variables from .env file, but only in development mode.
 */
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: './.env' });
}

/**
 * Validate required environment variables to ensure the server runs properly.
 * The process will exit if any critical variable is missing.
 */
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

/**
 * If in production, ensure SSL certificate paths are properly set.
 */
if (process.env.NODE_ENV === 'production') {
  if (!process.env.SSL_KEY_PATH || !process.env.SSL_CERT_PATH || !process.env.SSL_CA_PATH) {
    console.error("❌ Missing SSL certificates! Check your environment variables.");
    process.exit(1);
  }
}

const app = express();

/**
 * Security Middleware
 * - helmet: Adds security headers
 * - cors: Restricts access to specified origins
 */
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL, // Restrict API access to the frontend domain
  methods: ['POST'], // MPesa only requires POST requests
  allowedHeaders: ['Content-Type', 'Authorization']
}));

/**
 * Rate Limiting
 * Limits the number of requests to prevent abuse of MPesa endpoints.
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Max 100 requests per window per IP
  message: 'Too many requests from this IP, please try again later'
});

/**
 * Parse JSON request bodies.
 * Also stores the raw body for MPesa signature validation.
 */
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf.toString();
  },
  limit: '1mb' // Prevent overly large payloads
}));

/**
 * Database Connection with Retry Logic
 * If the connection fails, it will retry up to 5 times before exiting.
 */
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

      if (retries === 0) {
        console.error('❌ Database connection failed after multiple attempts. Exiting...');
        process.exit(1);
      }

      await new Promise(res => setTimeout(res, 5000));
    }
  }
};

connectDB();

/**
 * Store MPesa configuration in app locals for easier access.
 */
app.locals.mpesaConfig = {
  shortCode: process.env.MPESA_SHORT_CODE,
  passkey: process.env.MPESA_PASSKEY,
  consumerSecret: process.env.MPESA_CONSUMER_SECRET,
  baseUrl: process.env.MPESA_API_BASE
};

/**
 * Load and use MPesa routes
 */
const mpesaRoutes = require('./routes/mpesaRoutes');
app.use('/api/v1/mpesa', apiLimiter, mpesaRoutes);

/**
 * Validate MPesa Callback Signature
 * Ensures that the callback received is from Safaricom by verifying the HMAC signature.
 */
const validateMpesaCallback = (req, res, next) => {
  const signature = crypto
    .createHmac('sha256', process.env.MPESA_CONSUMER_SECRET)
    .update(req.rawBody)
    .digest('base64');

  if (signature !== req.headers['x-mpesa-signature']) {
    console.warn('⚠️ Invalid MPesa Callback Signature from:', req.ip);
    return res.status(403).json({ 
      ResultCode: 1,
      ResultDesc: 'Invalid signature' 
    });
  }
  next();
};

/**
 * Global Error Handling Middleware
 * Logs errors and provides friendly error messages to clients.
 */
app.use((err, req, res, next) => {
  console.error('🚨 Global Error:', {
    path: req.path,
    method: req.method,
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack
  });

  if (req.path.includes('mpesa/callback')) {
    return res.status(200).json({ 
      ResultCode: 1, 
      ResultDesc: 'Service unavailable' 
    });
  }

  res.status(err.statusCode || 500).json({
    status: 'error',
    message: process.env.NODE_ENV === 'production' 
      ? 'An unexpected error occurred' 
      : err.message
  });
});

/**
 * Start the Server
 * Uses HTTPS in production, otherwise falls back to HTTP.
 */
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

/**
 * Graceful Shutdown
 * Ensures the server and database connection close properly when stopping.
 */
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
