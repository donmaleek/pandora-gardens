/**
 * User Database Model
 * @module models/User
 * @description Defines the structure and behavior of user accounts in the system.
 * Handles authentication, security, and profile management with MongoDB.
 * 
 * @requires mongoose - MongoDB object modeling tool
 * @requires bcryptjs - Password hashing library
 * 
 * @example
 * // Create a new user
 * const user = new User({
 *   name: 'John Doe',
 *   email: 'john@example.com',
 *   password: 'securePassword123'
 * });
 * await user.save();
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * Main User Schema Definition
 * @type {mongoose.Schema}
 * 
 * @property {Object} name - User's full name
 * @property {Object} email - Unique email address
 * @property {Object} phone - International phone number
 * @property {Object} password - Hashed password storage
 * @property {Object} role - System access role
 * @property {Object} isVerified - Email verification status
 * @property {Object} otp - One-Time Password for 2FA
 * @property {Object} otpExpires - OTP expiration timestamp
 * @property {String} passwordResetToken - Hashed password reset token
 * @property {Date} passwordResetExpires - Password reset expiration
 * @property {Object} loginAttempts - Failed login counter
 * @property {Object} lockUntil - Account lock expiration timestamp
 * @property {Object} location - Geographic location
 * @property {Object} bio - Personal description
 */
const userSchema = new mongoose.Schema(
  {
    // ----------------------------
    // Core User Information
    // ----------------------------
    
    /**
     * @member {Object} name
     * @property {String} type - Data type
     * @property {Boolean} required - Mandatory field
     * @property {Function} trim - Automatic whitespace trimming
     * @property {Number} minlength - Minimum 2 characters
     * @property {Number} maxlength - Maximum 50 characters
     */
    name: {
      type: String,
      required: [true, '❌ Name is required'],
      trim: true,
      minlength: [2, '❌ Name must be at least 2 characters'],
      maxlength: [50, '❌ Name cannot exceed 50 characters'],
    },

    /**
     * @member {Object} email
     * @property {String} type - Data type
     * @property {Boolean} required - Mandatory field
     * @property {Boolean} unique - Prevent duplicate emails
     * @property {Boolean} lowercase - Force lowercase storage
     * @property {Object} validate - Email format validation
     */
    email: {
      type: String,
      required: [true, '❌ Email is required'],
      unique: true,
      lowercase: true,
      validate: {
        validator: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
        message: '❌ Invalid email format',
      },
    },

    /**
     * @member {Object} phone
     * @property {String} type - Data type
     * @property {Boolean} required - Mandatory field
     * @property {Object} validate - International phone format validation
     */
    phone: {
      type: String,
      required: [true, '❌ Phone number is required'],
      validate: {
        validator: (v) => /^(\+?\d{1,4}[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}$/.test(v),
        message: '❌ Invalid phone number format',
      },
    },

    // ----------------------------
    // Authentication & Security
    // ----------------------------
    
    /**
     * @member {Object} password
     * @property {String} type - Data type
     * @property {Boolean} required - Mandatory field
     * @property {Number} minlength - Minimum 8 characters
     * @property {Boolean} select - Never return in queries
     */
    password: {
      type: String,
      required: [true, '❌ Password is required'],
      minlength: [8, '❌ Password must be at least 8 characters'],
      select: false,
    },

    /**
     * @member {Object} role
     * @property {String} type - Data type
     * @property {Boolean} required - Mandatory field
     * @property {Array} enum - Allowed role values
     * @property {String} default - Default role assignment
     */
    role: {
      type: String,
      required: [true, '❌ Role is required'],
      enum: ['tenant', 'landlord', 'agent', 'admin'],
      default: 'tenant'
    },

    /**
     * @member {Object} isVerified
     * @property {Boolean} type - Data type
     * @property {Boolean} default - Initial unverified state
     */
    isVerified: {
      type: Boolean,
      default: false
    },

    /**
     * @member {Object} otp
     * @property {String} type - Data type
     * @property {Boolean} select - Never return in queries
     */
    otp: {
      type: String,
      select: false
    },

    /**
     * @member {Object} otpExpires
     * @property {Date} type - Data type
     * @property {Boolean} select - Never return in queries
     */
    otpExpires: {
      type: Date,
      select: false
    },

    /**
     * @member {String} passwordResetToken - Hashed reset token
     */
    passwordResetToken: String,

    /**
     * @member {Date} passwordResetExpires - Token validity window
     */
    passwordResetExpires: Date,

    // ----------------------------
    // Account Security
    // ----------------------------
    
    /**
     * @member {Object} loginAttempts
     * @property {Number} type - Data type
     * @property {Number} default - Initial attempt count
     */
    loginAttempts: {
      type: Number,
      default: 0
    },

    /**
     * @member {Object} lockUntil
     * @property {Date} type - Data type
     */
    lockUntil: {
      type: Date
    },

    // ----------------------------
    // Profile Information
    // ----------------------------
    
    /**
     * @member {Object} location
     * @property {String} type - Data type
     * @property {Number} maxlength - Maximum 100 characters
     */
    location: {
      type: String,
      maxlength: [100, '❌ Location cannot exceed 100 characters']
    },

    /**
     * @member {Object} bio
     * @property {String} type - Data type
     * @property {Number} maxlength - Maximum 500 characters
     */
    bio: {
      type: String,
      maxlength: [500, '❌ Bio cannot exceed 500 characters']
    }
  },
  {
    /**
     * Schema Configuration Options
     * @property {Boolean} timestamps - Automatic createdAt/updatedAt fields
     * @property {Object} toJSON - JSON conversion settings
     */
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        // Remove sensitive fields from JSON output
        delete ret.password;
        delete ret.__v;
        delete ret.otp;
        delete ret.otpExpires;
        return ret;
      },
    },
  }
);

// ----------------------------
// Password Hashing Middleware
// ----------------------------

/**
 * Pre-save Hook for Password Hashing
 * @hook pre('save')
 * @description Automatically hashes passwords before saving to database
 * 
 * @param {Function} next - Mongoose middleware callback
 * 
 * @example
 * const user = new User({ password: 'secret' });
 * await user.save(); // Triggers password hashing
 */
userSchema.pre('save', async function (next) {
  // Only hash password if modified
  if (!this.isModified('password')) return next();

  try {
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 12;
    const salt = await bcrypt.genSalt(saltRounds);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(new Error('🔒 Password hashing failed: ' + error.message));
  }
});

// ----------------------------
// Instance Methods
// ----------------------------

/**
 * Password Verification Method
 * @method matchPassword
 * @description Compares candidate password with stored hash
 * 
 * @param {String} candidatePassword - Password to verify
 * @returns {Promise<Boolean>} Password match result
 * 
 * @example
 * const isMatch = await user.matchPassword('password123');
 */
userSchema.methods.matchPassword = async function (candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('🔒 Password comparison failed: ' + error.message);
  }
};

/**
 * Account Lockout: Increment Failed Attempts
 * @method incrementLoginAttempts
 * @description Implements progressive account lockout:
 * - 5 failed attempts: 15-minute lock
 * - Subsequent attempts: 24-hour lock
 * 
 * @returns {Promise} Database update operation
 */
userSchema.methods.incrementLoginAttempts = async function () {
  if (this.lockUntil && this.lockUntil > Date.now()) return;
  
  const updates = {
    $inc: { loginAttempts: 1 },
    $set: { lockUntil: Date.now() + 15*60*1000 } // 15 minute lock
  };
  
  if (this.loginAttempts + 1 >= 5) {
    updates.$set.lockUntil = Date.now() + 24*60*60*1000; // 24 hour lock
  }
  
  return this.updateOne(updates);
};

/**
 * Reset Security Counters
 * @method resetLoginAttempts
 * @description Clears failed login attempts after successful authentication
 * 
 * @returns {Promise} Database update operation
 */
userSchema.methods.resetLoginAttempts = async function () {
  return this.updateOne({
    $set: { loginAttempts: 0 },
    $unset: { lockUntil: 1 }
  });
};

// ----------------------------
// Model Export
// ----------------------------

/**
 * Mongoose User Model
 * @type {mongoose.Model}
 */
module.exports = mongoose.model('User', userSchema);