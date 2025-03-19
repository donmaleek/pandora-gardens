/**
 * Authentication routes with integrated security middleware
 * @module routes/authRoutes
 * @description Handles user authentication flows with layered security protections
 */

const express = require('express');
const authController = require('../controllers/authController.js');
const rateLimit = require('express-rate-limit');
const { body } = require('express-validator');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const slowDown = require('express-slow-down');

const router = express.Router();

// ======================
// SECURITY MIDDLEWARE
// ======================
router.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"]
    }
  }),
  helmet.hsts({ // 🔥 Added HSTS
    maxAge: 63072000,
    includeSubDomains: true,
    preload: true
  }),
  mongoSanitize({ replaceWith: '_' })
);

// ======================
// RATE LIMITERS
// ======================
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

// 🔥 Added verification limiters
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
// VALIDATION MIDDLEWARE 
// ======================
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

const validateLogin = [
  body('email')
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// 🔥 Added 2FA validation
const validate2FA = [
  body('code')
    .isLength({ min: 6, max: 6 })
    .withMessage('Invalid verification code')
    .isNumeric()
    .withMessage('Code must be numeric')
];

// ======================
// ROUTE CONFIGURATION
// ======================
const loginSpeedLimit = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 3,
  delayMs: 1500
});

// 🔥 Added new routes
router.post(
  '/send-verification',
  verificationLimiter,
  authController.sendVerificationEmail
);

router.get(
  '/verify-email',
  verificationLimiter,
  authController.verifyEmail
);

router.post(
  '/send-2fa',
  twoFaLimiter,
  authController.send2FACode
);

router.post(
  '/verify-2fa',
  twoFaLimiter,
  validate2FA,
  authController.verify2FA
);

// Existing routes remain unchanged
router.post(
  '/register',
  registrationLimiter,
  validateRegistration,
  authController.register
);

router.post(
  '/login',
  authLimiter,
  loginSpeedLimit,
  validateLogin,
  authController.login
);

router.post(
  '/forgot-password',
  authLimiter,
  authController.forgotPassword
);

// ======================
// SECURITY HEADERS
// ======================
router.use((req, res, next) => {
  res.set({
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'interest-cohort=()' // 🔥 Added
  });
  next();
});

// ======================
// ERROR HANDLING
// ======================
router.use((err, req, res, next) => {
  console.error('Auth Route Error:', err);
  
  // 🔥 Added specific error handling
  const statusCode = err.statusCode || 500;
  const message = err.name === 'TokenExpiredError' 
    ? 'Verification link expired' 
    : err.message || 'Authentication error';

  res.status(statusCode).json({
    status: 'error',
    error: message
  });
});

module.exports = router;