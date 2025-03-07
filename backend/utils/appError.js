/**
 * Custom Error Class for operational errors
 * @module utils/appError
 * @class AppError
 * @extends Error
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 */
class AppError extends Error {
    constructor(message, statusCode) {
      super(message);
      
      this.statusCode = statusCode;
      this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
      this.isOperational = true;
      
      Error.captureStackTrace(this, this.constructor);
    }
  
    /**
     * Create validation error from Joi error
     * @static
     * @param {ValidationError} error - Joi validation error
     * @returns {AppError}
     */
    static createValidationError(error) {
      const message = error.details.map(detail => detail.message).join('. ');
      return new AppError(`Validation Error: ${message}`, 400);
    }
  }
  
  module.exports = AppError;