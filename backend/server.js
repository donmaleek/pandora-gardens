require('dotenv').config();

// ====== Keep all imports first ======
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
// ====== End of imports ======

// ====== Initialize logger after importing winston ======
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'server.log' })
  ]
});

// ====== Environment Validation ======
if (!process.env.MONGODB_URI) {
  logger.error('❌ FATAL ERROR: MONGODB_URI is not defined');
  // ====== ADDED HELPFUL MESSAGE ======
  logger.error('💡 Did you mean to use MONGO_URI? Rename it to MONGODB_URI in .env');
  logger.info('Current environment variables:', Object.keys(process.env));
  process.exit(1);
}

if (!process.env.JWT_SECRET) {
  logger.error('❌ FATAL ERROR: JWT_SECRET is not defined');
  process.exit(1);
}
// ====== End of validation ======

const User = require('./models/User');
const { sendEmail, sendSMS } = require('./utils/notifications');
const { authenticateMiddleware } = require('./middleware/authMiddleware');
require('./utils/reminderService');

const mpesaRoutes = require('./routes/mpesaRoutes');
const emailRoutes = require('./routes/emailRoutes');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

// Logger setup using Winston (keep original configuration)
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://your-production-domain.com'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(helmet());
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined'));

// Rate limiting (original configuration)
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

// Database connection with improved diagnostics
mongoose.set('strictQuery', false);

// Enhanced connection logging
logger.info(`🔍 Attempting connection to: ${process.env.MONGODB_URI.replace(/(mongodb(\+srv)?:\/\/[^:]+:)([^@]+)/, '$1*****')}`);

// Connection event listeners
mongoose.connection.on('connected', () => {
  logger.info('📊 MongoDB Connection Established');
});

mongoose.connection.on('error', (err) => {
  logger.error(`‼️ MongoDB Connection Error: ${err.message}`);
});

mongoose.connection.on('disconnected', () => {
  logger.warn('📴 MongoDB Connection Lost');
});

// Connection function with retries
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

// Authentication & User Routes
app.post('/api/user/send-verification', authenticateMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const verificationLink = `http://localhost:5000/verify-email?token=${token}`;

    await sendEmail(user.email, 'Verify Your Email', `Click the link to verify: ${verificationLink}`);
    res.json({ message: 'Verification email sent' });
  } catch (error) {
    logger.error('❌ Error sending verification email:', error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.post('/api/user/send-2fa', authenticateMiddleware, async (req, res) => {
  try {
    const code = Math.floor(100000 + Math.random() * 900000);
    req.user.otp = code;
    await req.user.save();
    await sendSMS(req.user.phone, `Your 2FA code: ${code}`);
    res.json({ message: '2FA code sent' });
  } catch (error) {
    logger.error('❌ Error sending 2FA code:', error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Profile Page Route
app.get('/api/user/profile', authenticateMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    logger.error('❌ Error fetching user profile:', error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Routes
app.use('/api/v1/mpesa', mpesaRoutes);
app.use('/api/v1/email', emailRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/admin', adminRoutes);

app.get('/', (req, res) => {
  res.send('Welcome to the API');
});

// Global Error Handling Middleware
app.use((err, req, res, next) => {
  logger.error(`❌ ${err.message} - ${req.method} ${req.originalUrl}`);
  const statusCode = err.status || 500;
  res.status(statusCode).json({ message: err.message || 'Internal Server Error' });
});

// Handle Undefined Routes
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route Not Found' });
});

// Server Initialization
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
  server = app.listen(process.env.PORT || 5000, () => {
    logger.info(`🚀 Development server running on port ${process.env.PORT || 5000}`);
  });
}

// Graceful Shutdown
process.on('SIGTERM', async () => {
  logger.info('🛑 SIGTERM received - closing server');
  server.close(async () => {
    logger.info('✅ Server shutting down gracefully...');
    if (mongoose.connection.readyState) await mongoose.connection.close();
    logger.info('📦 MongoDB connection closed');
    process.exit(0);
  });
});