/**
 * Custom error handling framework for Express applications
 * @module errorHandlers
 */

/**
 * Custom application error class for operational errors
 * @class AppError
 * @extends Error
 * @description Represents operational errors that can be anticipated and handled
 * 
 * @example
 * throw new AppError('Resource not found', 404);
 * 
 * @param {string} message - Human-readable error description
 * @param {number} statusCode - HTTP status code
 */
class AppError extends Error {
    /**
     * Create an application error
     * @param {string} message - Error message
     * @param {number} statusCode - HTTP status code
     */
    constructor(message, statusCode) {
      super(message);
      
      /**
       * HTTP status code
       * @member {number}
       */
      this.statusCode = statusCode;
      
      /**
       * Status type based on status code
       * @member {string}
       */
      this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
      
      /**
       * Operational error flag (vs programming error)
       * @member {boolean}
       */
      this.isOperational = true;
  
      // Capture stack trace excluding constructor call
      Error.captureStackTrace(this, this.constructor);
    }
  }
  
  /**
   * Handles Mongoose validation errors by formatting error messages
   * @function handleValidationError
   * @param {ValidationError} err - Mongoose validation error
   * @returns {AppError} Formatted application error
   * 
   * @example
   * app.post('/users', (req, res, next) => {
   *   User.create(req.body).catch(err => next(handleValidationError(err)));
   * });
   */
  const handleValidationError = (err) => {
    const errors = Object.values(err.errors).map(el => el.message);
    return new AppError(`Invalid input: ${errors.join('. ')}`, 400);
  };
  
  /**
   * Global error handling middleware
   * @function globalErrorHandler
   * @description Central error handling middleware for Express
   * @param {Error} err - Error object
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   * @param {NextFunction} next - Express next function
   * 
   * @example
   * app.use(globalErrorHandler);
   * 
   * @remarks
   * Environment-specific responses:
   * - Development: Full error details and stack trace
   * - Production: Generic messages for non-operational errors
   */
  const globalErrorHandler = (err, req, res, next) => {
    // Default to 500 if no status code provided
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';
  
    /**
     * Error response object structure
     * @typedef {Object} ErrorResponse
     * @property {string} status - Error status (fail/error)
     * @property {Error} [error] - Full error object (development only)
     * @property {string} message - Error message
     * @property {string} [stack] - Stack trace (development only)
     */
    const errorResponse = {
      status: err.status,
      error: err,
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    };
  
    // Production environment sanitization
    if (process.env.NODE_ENV === 'production') {
      errorResponse.message = err.isOperational 
        ? err.message 
        : 'Something went wrong!';
      delete errorResponse.stack;
      delete errorResponse.error;
    }
  
    // Send JSON response with appropriate status code
    res.status(err.statusCode).json(errorResponse);
  };
  
  module.exports = { AppError, globalErrorHandler, handleValidationError };
  
  /**
   * Error Handling Architecture Documentation:
   * 
   * 1. AppError Class:
   *    - Operational error marker
   *    - Automatic status code categorization
   *    - Clean stack trace capture
   * 
   * 2. Validation Error Handler:
   *    - Formats Mongoose validation errors
   *    - Combines multiple error messages
   *    - Returns consistent 400 Bad Request
   * 
   * 3. Global Error Handler:
   *    - Unified error response format
   *    - Environment-sensitive details
   *    - Security-conscious production output
   * 
   * Best Practices:
   * 1. Use AppError for all anticipated errors
   * 2. Handle promise rejections with custom errors
   * 3. Implement separate error handling middleware
   * 4. Monitor unhandled rejections and exceptions
   * 5. Log errors for production debugging
   * 
   * Security Considerations:
   * - Never expose stack traces in production
   * - Sanitize error messages from 3rd-party libraries
   * - Use generic messages for non-operational errors
   * 
   * @see {@link https://expressjs.com/en/guide/error-handling.html|Express Error Handling}
   */