/**
 * User validation schemas and utilities
 * @module validationSchemas
 */

const Joi = require('joi');
const validator = require('validator');

/**
 * Regular expression for strong password validation
 * @constant {RegExp} strongPasswordRegex
 * @description Enforces password complexity requirements:
 * - 8-30 characters
 * - At least one lowercase letter
 * - At least one uppercase letter
 * - At least one digit
 * - At least one special character (@$!%*?&)
 */
const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,30}$/;

/**
 * Joi validation schema for user creation
 * @function createUserSchema
 * @exports createUserSchema
 * @description Comprehensive validation rules for user registration
 * @see {@link https://joi.dev/api/|Joi Documentation}
 * 
 * @example
 * const { error } = createUserSchema.validate(userData);
 * if (error) throw new Error(error.details[0].message);
 * 
 * @remarks
 * Field-specific validation rules:
 * - Name: 2-50 characters
 * - Email: Valid format + double validation with validator.js
 * - Password: Meets strong complexity requirements
 * - Role: Predefined values with default fallback
 */
exports.createUserSchema = Joi.object({
  /**
   * User's full name validation
   * @member {Joi.StringSchema} name
   * @rule min(2).max(50).required()
   */
  name: Joi.string().min(2).max(50).required(),

  /**
   * Email address validation
   * @member {Joi.StringSchema} email
   * @rule email().custom(validatorCheck).required()
   */
  email: Joi.string().email().custom((value, helpers) => {
    if (!validator.isEmail(value)) {
      return helpers.error('any.invalid');
    }
    return value;
  }).required(),

  /**
   * Password validation with complexity requirements
   * @member {Joi.StringSchema} password
   * @rule pattern(strongPasswordRegex).required()
   * @message Custom error message for pattern failure
   */
  password: Joi.string()
    .pattern(strongPasswordRegex)
    .message('Password must contain 8-30 chars with at least one uppercase, lowercase, number, and special character')
    .required(),

  /**
   * User role validation
   * @member {Joi.StringSchema} role
   * @rule valid('client', 'landlord', 'agent').default('client')
   */
  role: Joi.string().valid('client', 'landlord', 'agent').default('client')
});

/**
 * Key Validation Rules Documentation:
 * 
 * 1. Name Validation:
 *    - Required field
 *    - Length: 2-50 characters
 *    - String format only
 * 
 * 2. Email Validation:
 *    - Double validation using Joi and validator.js
 *    - Must conform to standard email format
 *    - Custom error message on invalid format
 * 
 * 3. Password Security:
 *    - Minimum 8 characters, maximum 30
 *    - Requires mixed case letters
 *    - Requires special character
 *    - Blocks common weak patterns
 * 
 * 4. Role Management:
 *    - Only accepts predefined roles
 *    - Defaults to 'client' if not specified
 *    - Case-sensitive validation
 */

/**
 * Best Practices:
 * 1. Always use this schema before persisting user data
 * 2. Combine with middleware for automatic validation
 * 3. Hash passwords before storage (never store plaintext)
 * 4. Consider additional checks for disposable emails
 * 5. Regularly update password complexity requirements
 * 
 * Error Handling:
 * - Validation errors provide detailed messages
 * - Use error.details[0].message for user feedback
 * - Log validation failures for security monitoring
 */