/**
 * Security middleware modules for Express applications
 * @module securityMiddlewares
 */

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const xss = require('xss-clean');
const mongoSanitize = require('express-mongo-sanitize');

/**
 * Sets various security HTTP headers and Content Security Policy (CSP)
 * @function setSecurityHeaders
 * @description Configures Helmet middleware with custom security headers and CSP directives
 * @exports setSecurityHeaders
 * @see {@link https://helmetjs.github.io/|Helmet documentation}
 * 
 * @example
 * app.use(setSecurityHeaders);
 * 
 * @remarks
 * Content Security Policy (CSP) configuration:
 * - Default sources restricted to self
 * - Inline scripts/styles allowed (consider removing in production)
 * - Images allowed from self, data URIs, and Cloudinary
 * - Connect sources include API base URL from environment
 */
exports.setSecurityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],        // Default source policy
      scriptSrc: ["'self'", "'unsafe-inline'"], // Allow inline scripts
      styleSrc: ["'self'", "'unsafe-inline'"],  // Allow inline styles
      imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com'], // Image sources
      connectSrc: ["'self'", process.env.API_BASE_URL] // Allowed connect sources
    }
  }
});

/**
 * Rate limiting middleware for API endpoints
 * @function apiLimiter
 * @exports apiLimiter
 * @description Limits repeated requests to public APIs to prevent brute-force attacks
 * @see {@link https://express-rate-limit.mintlify.app/|Rate Limit documentation}
 * 
 * @example
 * app.use('/api/', apiLimiter);
 * 
 * @remarks
 * Current configuration:
 * - Time window: 15 minutes
 * - Max requests per IP: 100
 * - Custom response message for exceeded limits
 */
exports.apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minute window
  max: 100,                 // Max 100 requests per IP
  message: '❌ Too many requests from this IP, please try again later'
});

/**
 * Data sanitization middleware chain
 * @function sanitizeData
 * @exports sanitizeData
 * @description Array of middlewares for input data sanitization
 * 
 * @example
 * app.use(sanitizeData);
 * 
 * @remarks
 * Includes:
 * 1. XSS Clean - Sanitizes user input against XSS attacks
 * 2. MongoDB Sanitize - Removes prohibited characters from inputs
 * 
 * @see {@link https://www.npmjs.com/package/xss-clean|xss-clean documentation}
 * @see {@link https://www.npmjs.com/package/express-mongo-sanitize|mongo-sanitize documentation}
 */
exports.sanitizeData = [
  // Sanitize against XSS attacks
  xss(), 
  
  // Prevent MongoDB operator injection
  mongoSanitize({
    replaceWith: '_', // Replacement for prohibited characters
    onSanitize: ({ req, key }) => {
      console.warn(`[SANITIZATION] Removed prohibited characters from ${key}`, req);
    }
  })
];