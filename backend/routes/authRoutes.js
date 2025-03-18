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
const slowDown = require('express-slow-down'); // Moved to top with other imports

const router = express.Router();

// ======================
// SECURITY MIDDLEWARE
// ======================
router.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"], // Keep original value
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"]
    }
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

// ======================
// ROUTE CONFIGURATION
// ======================
const loginSpeedLimit = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 3,
  delayMs: 1500
});

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
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  });
  next();
});

// ======================
// ERROR HANDLING
// ======================
router.use((err, req, res, next) => {
  console.error('Auth Route Error:', err);
  res.status(500).json({
    status: 'error',
    error: 'Internal authentication error'
  });
});

// Debugging check
console.log('Controller Methods:', {
  register: typeof authController.register,
  login: typeof authController.login,
  forgotPassword: typeof authController.forgotPassword
});

module.exports = router;