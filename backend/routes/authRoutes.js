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

const router = express.Router();



// ======================
// SECURITY MIDDLEWARE
// ======================

/**
 * Security middleware stack for authentication endpoints
 * @middleware
 * @description Applies essential security protections to all auth routes
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
  mongoSanitize({ replaceWith: '_' })
);

// ======================
// RATE LIMITERS (Keep only one declaration)
// ======================

/**
 * Authentication attempt rate limiter
 * @constant {RateLimit}
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Registration rate limiter
 * @constant {RateLimit}
 */
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

/**
 * Registration validation chain
 * @constant {Array}
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

// ======================
// ROUTE CONFIGURATION
// ======================

router.post(
  '/register',
  registrationLimiter,
  validateRegistration,
  authController.register
);

router.post(
  '/login',
  authLimiter,
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

// Debugging check
console.log('Controller Methods:', {
  register: typeof authController.register,
  login: typeof authController.login,
  forgotPassword: typeof authController.forgotPassword
});

module.exports = router;