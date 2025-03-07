/**
 * Centralized logging configuration using Winston
 * @module logger
 * @description Configures application-wide logging with file transports and console output
 */

const winston = require('winston');
const { combine, timestamp, printf, colorize } = winston.format;

/**
 * Custom log message format
 * @function logFormat
 * @param {LogEntry} logEntry - Winston log entry object
 * @returns {string} Formatted log string
 * 
 * @example
 * // Output: '2023-08-01 12:30:45 [info]: Server started on port 3000'
 * 
 * @remarks
 * Format structure:
 * - Timestamp (YYYY-MM-DD HH:mm:ss)
 * - Colored log level
 * - Log message
 */
const logFormat = printf(({ level, message, timestamp }) => {
  return `${timestamp} [${level}]: ${message}`;
});

/**
 * Winston logger instance with configured transports and formats
 * @constant {winston.Logger} logger
 * 
 * @property {Object} configuration - Logger settings:
 * @property {string} level - Default log level ('info')
 * @property {winston.Logform.Format} format - Combined format configuration
 * @property {winston.transport[]} transports - Log output destinations
 * 
 * @see {@link https://github.com/winstonjs/winston|Winston Documentation}
 */
const logger = winston.createLogger({
  level: 'info',
  format: combine(
    colorize({ all: true }),    // Colorize log level
    timestamp({                 // Add timestamp
      format: 'YYYY-MM-DD HH:mm:ss',
    }),
    logFormat                  // Apply custom format
  ),
  transports: [
    // Error-level logs to separate file
    new winston.transports.File({ 
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 1024 * 1024 * 5, // 5MB per file
      maxFiles: 3
    }),
    // All logs to combined file
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 1024 * 1024 * 10, // 10MB per file
      maxFiles: 5
    })
  ]
});

/**
 * Add console transport in non-production environments
 * @description Enable colored console output for development/debugging
 */
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: combine(
      colorize(),
      logFormat
    )
  }));
}

module.exports = logger;

/**
 * Logging Architecture Documentation:
 * 
 * 1. Transport Configuration:
 *    - Error logs: Stored separately in error.log (max 3x5MB files)
 *    - All logs: Stored in combined.log (max 5x10MB files)
 *    - Console output: Enabled in non-production environments
 * 
 * 2. Log Levels:
 *    - error: Runtime errors and critical issues
 *    - warn: Potential problems
 *    - info: General operational messages
 *    - http: HTTP requests logging
 *    - verbose: Detailed debug information
 *    - debug: Diagnostic information
 *    - silly: Extreme verbosity
 * 
 * 3. Format Features:
 *    - Human-readable timestamps
 *    - Color-coded log levels
 *    - Consistent message structure
 * 
 * Usage Examples:
 * 
 * // Basic logging
 * logger.info('Server started on port 3000');
 * logger.error('Database connection failed', { error: err });
 * 
 * // Logging with metadata
 * logger.warn('Unauthorized access attempt', {
 *   ip: req.ip,
 *   user: req.user?.id
 * });
 */

/**
 * Best Practices:
 * 1. Use appropriate log levels for different scenarios
 * 2. Include contextual metadata in log messages
 * 3. Regularly rotate and archive log files
 * 4. Monitor log file sizes and retention policies
 * 5. Avoid logging sensitive information
 * 6. Combine with log aggregation tools in production
 * 
 * Maintenance Notes:
 * - Log file paths are relative to application root
 * - File size limits prevent disk space exhaustion
 * - Consider adding remote transports (e.g., CloudWatch, ELK) for production
 * 
 * Security Considerations:
 * - Restrict filesystem permissions for log directories
 * - Sanitize user input in log messages
 * - Disable debug logging in production
 * - Implement log filtering for sensitive data
 */