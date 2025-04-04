/**
 * User Database Model
 * @module models/User
 * @description Defines the structure and behavior of user accounts in the system.
 * Handles authentication, security, and profile management with MongoDB.
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    // Core User Information
    name: {
      type: String,
      required: [true, '❌ Name is required'],
      trim: true,
      minlength: [2, '❌ Name must be at least 2 characters'],
      maxlength: [50, '❌ Name cannot exceed 50 characters'],
    },

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

    phone: {
      type: String,
      required: [true, '❌ Phone number is required'],
      validate: {
        validator: (v) => /^(\+?\d{1,4}[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}$/.test(v),
        message: '❌ Invalid phone number format',
      },
    },

    // Authentication & Security
    password: {
      type: String,
      required: [true, '❌ Password is required'],
      minlength: [8, '❌ Password must be at least 8 characters'],
      select: false,
    },

    role: {
      type: String,
      required: [true, '❌ Role is required'],
      enum: ['tenant', 'landlord', 'agent', 'admin'],
      default: 'tenant'
    },

    isVerified: {
      type: Boolean,
      default: false
    },

    // Security Fields
    otp: { type: String, select: false },
    otpExpires: { type: Date, select: false },
    passwordResetToken: String,
    passwordResetExpires: Date,
    loginAttempts: { type: Number, default: 0 },
    lockUntil: Date,

    // Profile Information
    location: {
      type: String,
      maxlength: [100, '❌ Location cannot exceed 100 characters']
    },
    bio: {
      type: String,
      maxlength: [500, '❌ Bio cannot exceed 500 characters']
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        delete ret.password;
        delete ret.__v;
        delete ret.otp;
        delete ret.otpExpires;
        return ret;
      },
    },
  }
);

// ==================== Password Handling ====================
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    // Normalize password before hashing
    this.password = await bcrypt.hash(this.password.trim(), 10);
    next();
  } catch (error) {
    next(new Error('🔒 Password hashing failed: ' + error.message));
  }
});

userSchema.methods.matchPassword = async function (candidatePassword) {
  try {
    
    return await bcrypt.compare(candidatePassword.trim(), this.password);
  } catch (error) {
    console.error('Password Verification Error:', {
      userId: this._id,
      error: error.message
    });
    return false;
  }
};

// ==================== Account Security ====================
userSchema.methods.incrementLoginAttempts = async function () {
  const LOCK_TIMES = {
    SHORT: 15 * 60 * 1000,   // 15 minutes
    LONG: 24 * 60 * 60 * 1000 // 24 hours
  };

  const updates = {
    $inc: { loginAttempts: 1 },
    $set: { lockUntil: Date.now() + LOCK_TIMES.SHORT }
  };

  if (this.loginAttempts + 1 >= 5) {
    updates.$set.lockUntil = Date.now() + LOCK_TIMES.LONG;
  }

  return this.updateOne(updates);
};

userSchema.methods.resetLoginAttempts = async function () {
  return this.updateOne({
    $set: { loginAttempts: 0 },
    $unset: { lockUntil: 1 }
  });
};

module.exports = mongoose.model('User', userSchema);