/**
 * SERVER CONFIGURATION FILE
 * This is the main backend server file for the application
 * Contains all routes, middleware configurations, and database connections
 * 
 * Key Fixes Applied:
 * 1. Added bcrypt import for password hashing
 * 2. Removed duplicate email verification route
 * 3. Fixed verification link in send-verification endpoint
 */

// ====== CORE DEPENDENCIES ======
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
const winston = require('winston');
const morgan = require('morgan');
const fs = require('fs');
const https = require('https');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt'); // 🔑 Added bcrypt for password hashing

// ====== INITIALIZE LOGGER ======
/**
 * Winston logger configuration
 * - Logs to both console and server.log file
 * - JSON format for structured logging
 */
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'server.log' })
  ]
});

// ====== ENVIRONMENT VALIDATION ======
if (!process.env.MONGODB_URI) {
  logger.error('❌ FATAL ERROR: MONGODB_URI is not defined');
  process.exit(1);
}

if (!process.env.JWT_SECRET) {
  logger.error('❌ FATAL ERROR: JWT_SECRET is not defined');
  process.exit(1);
}

// ====== DATABASE MODELS AND UTILITIES ======
const User = require('./models/User');
const { sendEmail, sendSMS } = require('./utils/notifications');
const { authenticateMiddleware } = require('./middleware/authMiddleware');
require('./utils/reminderService');

// ====== ROUTE IMPORTS ======
const mpesaRoutes = require('./routes/mpesaRoutes');
const emailRoutes = require('./routes/emailRoutes');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');

// ====== EXPRESS APP CONFIGURATION ======
const app = express();

// ====== SECURITY MIDDLEWARE ======
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://your-production-domain.com'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(helmet());
app.use(compression());

// ====== REQUEST PROCESSING MIDDLEWARE ======
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined'));

// ====== RATE LIMITING CONFIGURATION ======
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts. Please try again later.'
});
app.use('/api/v1/auth', authLimiter);

const mpesaLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: 'Too many MPesa requests. Slow down!'
});
app.use('/api/v1/mpesa', mpesaLimiter);

// ====== AUTHENTICATION ROUTES ======

/**
 * @route POST /api/v1/auth/register
 * @desc Register new user with email verification
 * @access Public
 */
app.post('/api/v1/auth/register', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body; // Added phone

    // Enhanced validation
    if (!name || !email || !password || !phone) {
      logger.error('Registration validation failed', { 
        received: { name: !!name, email: !!email, password: !!password, phone: !!phone }
      });
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Database check with timeout
    const existingUser = await User.findOne({ email }).maxTimeMS(5000);
    if (existingUser) {
      logger.warn('Duplicate registration attempt', { email });
      return res.status(400).json({ message: 'Email already exists' });
    }

    // Password hashing with validation
    const hashedPassword = await bcrypt.hash(password, 12)
      .catch(err => {
        logger.error('Bcrypt hashing failed', { error: err.stack });
        throw new Error('Password processing failed');
      });

    // User creation with phone
    const user = new User({ 
      name, 
      email, 
      password: hashedPassword,
      phone // Added phone field
    });

    await user.save()
      .catch(saveErr => {
        logger.error('Database save failed', {
          error: saveErr.message,
          stack: saveErr.stack,
          userData: { name, email, phone }
        });
        throw saveErr;
      });

    // JWT generation with verification
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    if (!token) throw new Error('JWT generation failed');

    // Email sending with error handling
    const verificationLink = `http://localhost:5000/api/v1/auth/verify-email?token=${token}`;
    await sendEmail(user.email, 'Verify Your Email', verificationLink)
      .catch(emailErr => {
        logger.error('Email sending failed', {
          error: emailErr.message,
          stack: emailErr.stack,
          recipient: user.email
        });
        // Continue even if email fails
      });

    res.status(201).json({ 
      message: 'User registered. Check your email for verification.',
      userId: user.id
    });

  } catch (error) {
    logger.error('REGISTRATION PROCESS FAILURE', {
      error: error.stack,
      environment: {
        dbConnected: mongoose.connection.readyState === 1,
        jwtSecretSet: !!process.env.JWT_SECRET,
        bcryptAvailable: typeof bcrypt !== 'undefined'
      },
      request: {
        body: req.body,
        headers: req.headers
      }
    });
    
    res.status(500).json({ 
      message: 'Registration failed. Please try again.',
      systemError: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});
/**
 * @route POST /api/v1/auth/login
 * @desc Authenticate user and return JWT token with extended details
 * @access Public
 */
app.post('/api/v1/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Detailed input validation
    if (!email || !password) {
      logger.warn('Login attempt with missing credentials', {
        endpoint: '/login',
        ip: req.ip,
        emailPresent: !!email,
        passwordPresent: !!password
      });
      return res.status(400).json({
        status: 'error',
        code: 'MISSING_CREDENTIALS',
        message: 'Both email and password are required'
      });
    }

    // Database health check
    if (mongoose.connection.readyState !== 1) {
      logger.error('Database connection not ready during login', {
        state: mongoose.connection.readyState,
        dbName: mongoose.connection.name
      });
      return res.status(503).json({
        status: 'error',
        code: 'DATABASE_UNAVAILABLE',
        message: 'Service temporarily unavailable'
      });
    }

    // Find user with security fields
    const user = await User.findOne({ email })
      .select('+password +isVerified +loginAttempts +lockUntil +phone')
      .maxTimeMS(5000);

    // Account lock check
    if (user?.lockUntil && user.lockUntil > Date.now()) {
      const remainingTime = Math.ceil((user.lockUntil - Date.now()) / 60000);
      logger.warn('Account locked login attempt', {
        email,
        userId: user._id,
        attempts: user.loginAttempts
      });
      return res.status(403).json({
        status: 'error',
        code: 'ACCOUNT_LOCKED',
        message: `Account temporarily locked. Try again in ${remainingTime} minutes`,
        retryAfter: remainingTime * 60
      });
    }

    // Credential validation
    if (!user || !(await bcrypt.compare(password, user.password))) {
      await user?.incrementLoginAttempts();
      logger.warn('Invalid login attempt', {
        email,
        ip: req.ip,
        attemptCount: user?.loginAttempts || 1
      });
      return res.status(401).json({
        status: 'error',
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password'
      });
    }

    // Email verification check
    if (!user.isVerified) {
      logger.warn('Unverified login attempt', { 
        userId: user._id,
        email: user.email
      });
      return res.status(403).json({
        status: 'error',
        code: 'UNVERIFIED_ACCOUNT',
        message: 'Please verify your email address first',
        verificationSent: user.verificationSentCount || 0
      });
    }

    // Generate JWT token with enhanced details
    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
        email: user.email,
        phone: user.phone
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Reset login attempts on success
    await user.resetLoginAttempts();

    logger.info('Successful login', {
      userId: user._id,
      role: user.role,
      ip: req.ip
    });

    res.json({
      status: 'success',
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role
        },
        token: {
          value: token,
          expiresIn: process.env.JWT_EXPIRES_IN || '7d',
          type: 'Bearer'
        }
      }
    });

  } catch (error) {
    logger.error('LOGIN PROCESS FAILURE', {
      error: error.stack,
      system: {
        dbConnected: mongoose.connection.readyState === 1,
        jwtSecretSet: !!process.env.JWT_SECRET,
        bcryptAvailable: typeof bcrypt.compare === 'function'
      },
      request: {
        body: { email: req.body.email },
        headers: req.headers
      }
    });

    res.status(500).json({
      status: 'error',
      code: 'SERVER_ERROR',
      message: 'Authentication system error',
      ...(process.env.NODE_ENV === 'development' && {
        debug: {
          error: error.message,
          stack: error.stack
        }
      })
    });
  }
});

// ====== EMAIL VERIFICATION ROUTE ======
/**
 * @route GET /api/v1/auth/verify-email
 * @desc Verify user email using JWT token
 * @access Public
 */
app.get('/api/v1/auth/verify-email', async (req, res) => {
  try {
    const { token } = req.query;
    
    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find user and update verification status
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.redirect('http://localhost:5173/email-verified?success=false&error=User%20not%20found');
    }

    if (user.isVerified) {
      return res.redirect('http://localhost:5173/email-verified?success=false&error=Email%20already%20verified');
    }

    user.isVerified = true;
    await user.save();

    // Redirect to frontend with success status
    res.redirect('http://localhost:5173/email-verified?success=true');
  } catch (error) {
    // Handle different error scenarios
    const errorMessage = error.name === 'TokenExpiredError' 
      ? 'Verification link expired' 
      : 'Invalid verification link';
    res.redirect(`http://localhost:5173/email-verified?success=false&error=${encodeURIComponent(errorMessage)}`);
  }
});

// ====== DATABASE CONNECTION SETUP ======
mongoose.set('strictQuery', false);

// Database connection events
mongoose.connection.on('connected', () => logger.info('📊 MongoDB Connection Established'));
mongoose.connection.on('error', (err) => logger.error(`‼️ MongoDB Connection Error: ${err.message}`));
mongoose.connection.on('disconnected', () => logger.warn('📴 MongoDB Connection Lost'));

/**
 * Database connection function with retry logic
 * @param {number} retries - Number of connection attempts
 */
const connectDB = async (retries = 5) => {
  const connectionOptions = {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    retryWrites: true,
    w: 'majority'
  };

  while (retries) {
    try {
      await mongoose.connect(process.env.MONGODB_URI, connectionOptions);
      logger.info('✅ MongoDB Connected');
      
      // Database health check
      setTimeout(async () => {
        try {
          await mongoose.connection.db.admin().ping();
          logger.info('🏓 Database Ping Successful');
        } catch (pingErr) {
          logger.error('‼️ Database Ping Failed:', pingErr.message);
        }
      }, 5000);
      
      return;
    } catch (err) {
      logger.error(`❌ Connection Attempt Failed (${retries} left): ${err.message}`);
      retries--;
      if (retries === 0) process.exit(1);
      await new Promise(res => setTimeout(res, 5000));
    }
  }
};

connectDB();

// ====== ADDITIONAL AUTH ROUTES ======

/**
 * @route POST /api/v1/auth/send-verification
 * @desc Resend email verification link
 * @access Private
 */
app.post('/api/v1/auth/send-verification', authenticateMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    if (user.isVerified) {
      return res.status(400).json({ message: 'Email already verified' });
    }

    // Generate new verification token
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const verificationLink = `http://localhost:5000/api/v1/auth/verify-email?token=${token}`; // ✅ Fixed verification link

    await sendEmail(user.email, 'Verify Your Email', `Click the link to verify: ${verificationLink}`);
    res.json({ message: 'Verification email sent' });
  } catch (error) {
    logger.error('❌ Error sending verification email:', error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ====== ROUTE MOUNTING ======
app.use('/api/v1/mpesa', mpesaRoutes);
app.use('/api/v1/email', emailRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/admin', adminRoutes);

// ====== SERVER INITIALIZATION ======
const PORT = process.env.PORT || 5000;
let server;

if (process.env.NODE_ENV === 'production') {
  const sslOptions = {
    key: fs.readFileSync(process.env.SSL_KEY_PATH),
    cert: fs.readFileSync(process.env.SSL_CERT_PATH),
    ca: fs.readFileSync(process.env.SSL_CA_PATH)
  };
  server = https.createServer(sslOptions, app).listen(443, () => {
    logger.info('🔒 HTTPS server running on port 443');
  });
} else {
  server = app.listen(PORT, () => {
    logger.info(`🚀 Development server running on port ${PORT}`);
  });
}

// ====== GRACEFUL SHUTDOWN HANDLER ======
process.on('SIGTERM', async () => {
  logger.info('🛑 SIGTERM received - closing server');
  server.close(async () => {
    logger.info('✅ Server shutting down gracefully...');
    if (mongoose.connection.readyState) await mongoose.connection.close();
    logger.info('📦 MongoDB connection closed');
    process.exit(0);
  });
});

// ====== GLOBAL ERROR HANDLER ======
app.use((err, req, res, next) => {
  logger.error(`❌ ${err.message} - ${req.method} ${req.originalUrl}`);
  const statusCode = err.status || 500;
  res.status(statusCode).json({ message: err.message || 'Internal Server Error' });
});

// ====== CATCH ALL ROUTE ======
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route Not Found' });
});

/**
 * BASIC HEALTH CHECK ENDPOINT
 * @route GET /
 * @desc Simple server status check
 * @access Public
 */
app.get('/', (req, res) => {
  res.send('Welcome to the API');
});