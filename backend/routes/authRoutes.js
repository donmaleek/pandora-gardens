/**
 * Authentication Routes Module
 * @module routes/authRoutes
 * @description Handles all authentication-related operations with integrated security measures.
 * Implements rate limiting, input validation, and security headers following best practices.
 * @requires express
 * @requires bcrypt
 * @requires jsonwebtoken
 * @see {@link module:models/User} for User model structure
 * @see {@link module:controllers/authController} for business logic
 */

const express = require('express');
const authController = require('../controllers/authController');
const rateLimit = require('express-rate-limit');
const { body } = require('express-validator');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const slowDown = require('express-slow-down');
const logger = require('../utils/logger');

const router = express.Router();

// ======================
// SECURITY MIDDLEWARE
// ======================
/**
 * Security middleware stack for authentication routes
 * @middleware
 * @name securityMiddleware
 * @description Applies multiple security layers:
 * - Content Security Policy (CSP)
 * - HTTP Strict Transport Security (HSTS)
 * - MongoDB query sanitization
 */
router.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"]
    }
  }),
  helmet.hsts({
    maxAge: 63072000,
    includeSubDomains: true,
    preload: true
  }),
  mongoSanitize({ replaceWith: '_' })
);

// ======================
// RATE LIMITING CONFIGURATION
// ======================
/**
 * Rate limiters for authentication endpoints
 * @constant {RateLimit} authLimiter - General authentication rate limiter
 * @constant {RateLimit} registrationLimiter - Account creation limiter
 * @constant {RateLimit} verificationLimiter - Email verification limiter
 * @constant {RateLimit} twoFaLimiter - 2FA attempt limiter
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false
});

const registrationLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 3,
  message: 'Too many accounts created from this IP',
  standardHeaders: true,
  legacyHeaders: false
});

const verificationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: 'Too many verification requests',
  standardHeaders: true
});

const twoFaLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many 2FA attempts',
  standardHeaders: true
});

// ======================
// INPUT VALIDATION CHAINS
// ======================
/**
 * Validation middleware for user registration
 * @constant {Array} validateRegistration
 * @property {ValidationChain} name - 2-50 character length check
 * @property {ValidationChain} email - Valid email format check
 * @property {ValidationChain} password - Complexity requirements check
 */
const validateRegistration = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2-50 characters'),
  body('email')
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
    .withMessage('Password must contain uppercase, lowercase, number, and special character')
];

/**
 * Validation middleware for user login
 * @constant {Array} validateLogin
 * @property {ValidationChain} email - Valid email format check
 * @property {ValidationChain} password - Presence check
 */
const validateLogin = [
  body('email')
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .trim()
    .withMessage('Password is required')
];

/**
 * Validation middleware for 2FA codes
 * @constant {Array} validate2FA
 * @property {ValidationChain} code - 6-digit numeric check
 */
const validate2FA = [
  body('code')
    .isLength({ min: 6, max: 6 })
    .withMessage('Invalid verification code')
    .isNumeric()
    .withMessage('Code must be numeric')
];

// ======================
// REQUEST THROTTLING
// ======================
/**
 * Login speed limiter to prevent brute force attacks
 * @constant {SlowDown} loginSpeedLimit
 */
const loginSpeedLimit = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 3,
  delayMs: () => 1500
});

// ======================
// ROUTE DEFINITIONS
// ======================
/**
 * @route POST /send-verification
 * @desc Resend email verification link
 * @access Public
 * @middleware verificationLimiter
 */
// Add temporary debug logging to authRoutes.js
console.log('Available authController methods:', Object.keys(authController));

router.post(
  '/verify-email',
  verificationLimiter,
  authController.sendVerificationEmail
);

/**
 * @route GET /verify-email
 * @desc Confirm email verification token
 * @access Public
 * @middleware verificationLimiter
 */
router.get(
  '/verify-email',
  verificationLimiter,
  authController.verifyEmail
);

/**
 * @route POST /send-2fa
 * @desc Send 2FA verification code
 * @access Public
 * @middleware twoFaLimiter
 */
router.post(
  '/send-2fa',
  twoFaLimiter,
  authController.send2FACode
);

/**
 * @route POST /verify-2fa
 * @desc Verify 2FA code
 * @access Public
 * @middleware twoFaLimiter
 * @middleware validate2FA
 */
router.post(
  '/verify-2fa',
  twoFaLimiter,
  validate2FA,
  authController.verify2FA
);

/**
 * @route POST /register
 * @desc Create new user account
 * @access Public
 * @middleware registrationLimiter
 * @middleware validateRegistration
 */
router.post(
  '/register',
  registrationLimiter,
  validateRegistration,
  authController.register
);

/**
 * @route POST /login
 * @desc Authenticate existing user
 * @access Public
 * @middleware authLimiter
 * @middleware loginSpeedLimit
 * @middleware validateLogin
 */
router.post(
  '/login',
  authLimiter,
  loginSpeedLimit,
  validateLogin,
  authController.login
);

/**
 * @route POST /forgot-password
 * @desc Initiate password reset process
 * @access Public
 * @middleware authLimiter
 */
router.post(
  '/forgot-password',
  authLimiter,
  authController.forgotPassword
);
/**
 * @route Patch /reset-password
 * @desc Initiate password reset process
 * @access Public
 * @middleware authLimiter
 */
router.patch(
  '/reset-password/:token',
  authLimiter,
  authController.resetPassword
);

// ======================
// SECURITY HEADERS
// ======================
/**
 * Security headers middleware
 * @middleware
 * @desc Adds security-related HTTP headers
 */
router.use((req, res, next) => {
  res.set({
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'interest-cohort=()'
  });
  next();
});

// ======================
// ERROR HANDLING
// ======================
/**
 * Global error handler for authentication routes
 * @middleware
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
router.use((err, req, res, next) => {
  logger.error('Auth Route Error:', { 
    error: err.stack,
    endpoint: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
  
  const statusCode = err.statusCode || 500;
  const message = err.name === 'TokenExpiredError' 
    ? 'Verification link expired' 
    : err.message || 'Authentication error';

  res.status(statusCode).json({
    status: 'error',
    error: process.env.NODE_ENV === 'development' ? message : 'Authentication failed'
  });
});

// ======================
// PASSWORD RESET IMPLEMENTATION
// ======================
/**
 * @route PATCH /reset-password/:token
 * @desc Complete password reset process
 * @access Public
 * @middleware authLimiter
 */
router.patch(
  '/reset-password/:token',
  authLimiter,
  async (req, res, next) => {
    try {
      // Verify reset token
      const hashedToken = crypto
        .createHash('sha256')
        .update(req.params.token)
        .digest('hex');

      const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: Date.now() }
      });

      if (!user) {
        return next(new AppError('Invalid or expired token', 400));
      }

      // Validate new password
      const { password } = req.body;
      if (!password) {
        return next(new AppError('Password is required', 400));
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(password, 10);
      user.password = hashedPassword;
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;

      await user.save();

      // Generate new JWT
      const token = jwt.sign(
        { id: user._id },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
      );

      res.status(200).json({
        status: 'success',
        token,
        data: {
          user: {
            id: user._id,
            name: user.name,
            email: user.email
          }
        }
      });
    } catch (error) {
      next(new AppError('Password reset failed', 500));
    }
  }
);

// ======================
// CUSTOM JWT VERIFICATION MIDDLEWARE
// ======================
const verifyToken = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(new AppError('Not authorized', 401));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const currentUser = await User.findById(decoded.id);

    if (!currentUser) {
      return next(new AppError('User no longer exists', 401));
    }

    req.user = currentUser;
    next();
  } catch (error) {
    next(new AppError('Invalid token', 401));
  }
};

// ======================
// PROTECTED ROUTE EXAMPLE
// ======================
/**
 * @route GET /me
 * @desc Get current user profile
 * @access Private
 */
router.get('/me', verifyToken, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password -__v');

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    res.status(200).json({
      status: 'success',
      data: { user }
    });
  } catch (error) {
    next(new AppError('Profile retrieval failed', 500));
  }
});

router.get('/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  const vitalChecks = {
    database: dbStatus,
    jwtConfigured: !!process.env.JWT_SECRET,
    bcryptRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10,
    memoryUsage: process.memoryUsage(),
    uptime: process.uptime()
  };

  res.status(200).json({
    status: dbStatus === 'connected' ? 'ok' : 'degraded',
    checks: vitalChecks
  });
});


module.exports = router;