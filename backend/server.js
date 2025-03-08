/**
 * server.js - Optimized for Safaricom Daraja Integration
 */

const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const mongoose = require('mongoose');
const crypto = require('crypto'); // Added for security
const axios = require('axios'); // Added for Daraja API calls
const authRouter = require('./routes/authRoutes');
const emailRouter = require('./routes/emailRoutes');
const mpesaRoutes = require('./routes/mpesaRoutes');

// Enhanced environment validation
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: './.env.development' });
}

const requiredEnvVars = [
  'MONGO_URI',
  'JWT_SECRET',
  'MPESA_CONSUMER_KEY',
  'MPESA_CONSUMER_SECRET',
  'MPESA_SHORT_CODE',
  'MPESA_PASSKEY',
  'MPESA_CALLBACK_URL'
];

requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    console.error(`🔥 Critical: Missing ${varName} environment variable`);
    process.exit(1);
  }
});

const app = express();

// Enhanced Security Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// MPesa-specific middleware
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf.toString(); // Needed for signature validation
  }
}));

// Database Connection (Optimized)
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
    });
    console.log('✅ MongoDB Connected with Production Settings');
  } catch (err) {
    console.error('❌ Critical Database Connection Failure:', err);
    process.exit(1);
  }
};

connectDB();

// Daraja Security Credentials Generator
const generateSecurityCredentials = () => {
  const initiatorPassword = process.env.MPESA_INITIATOR_PASSWORD;
  const passkey = process.env.MPESA_PASSKEY;
  
  return crypto.createHash('sha256')
    .update(`${initiatorPassword}${passkey}`)
    .digest('hex');
};

// MPesa Access Token Middleware (Reusable)
const getMpesaAccessToken = async () => {
  try {
    const response = await axios.get(
      'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
      {
        auth: {
          username: process.env.MPESA_CONSUMER_KEY,
          password: process.env.MPESA_CONSUMER_SECRET
        }
      }
    );
    return response.data.access_token;
  } catch (error) {
    console.error('🔒 MPesa Auth Error:', error.response.data);
    throw new Error('Failed to get MPesa access token');
  }
};

// Routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/emails', emailRouter);
app.use('/api/v1/mpesa', mpesaRoutes); // Changed to versioned endpoint

// Enhanced MPesa Callback Handler
app.post('/mpesa-callback', async (req, res) => {
  try {
    console.log('🔔 MPesa Callback Received:', req.body);
    
    // Validate callback signature
    const signature = crypto.createHmac('sha256', process.env.MPESA_CONSUMER_SECRET)
      .update(req.rawBody)
      .digest('base64');
      
    if (signature !== req.headers['x-mpesa-signature']) {
      console.warn('⚠️ Invalid MPesa Callback Signature');
      return res.status(401).end();
    }

    // Process transaction here
    res.status(200).json({ ResultCode: 0, ResultDesc: 'Success' });
    
  } catch (error) {
    console.error('💥 Callback Processing Error:', error);
    res.status(500).json({ ResultCode: 1, ResultDesc: 'Internal Server Error' });
  }
});

// Error Handling (Optimized)
app.use((err, req, res, next) => {
  console.error('🚨 Global Error:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack
  });
  
  res.status(err.statusCode || 500).json({
    status: 'error',
    message: process.env.NODE_ENV === 'production' 
      ? 'An unexpected error occurred' 
      : err.message
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`
  🚀 Server Status:
  - Port: ${PORT}
  - Environment: ${process.env.NODE_ENV || 'development'}
  - MPesa Mode: ${process.env.MPESA_ENV || 'sandbox'}
  - Callback URL: ${process.env.MPESA_CALLBACK_URL}
  `);
});