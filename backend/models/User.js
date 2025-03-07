/**
 * @module models/User
 * @description Defines the User schema and authentication methods for the application
 * @requires mongoose
 * @requires bcryptjs
 */

// ----------------------------
// Section 1: Dependencies
// ----------------------------
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// ----------------------------
// Section 2: Schema Definition
// ----------------------------
const userSchema = new mongoose.Schema(
  {
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
        validator: (v) => /^(\+?\d{1,3}[- ]?)?\d{7,15}$/.test(v),
        message: '❌ Invalid phone number format',
      },
    },
    password: {
      type: String,
      required: [true, '❌ Password is required'],
      minlength: [8, '❌ Password must be at least 8 characters'],
      select: false, // Automatically exclude in queries
    },
    role: {
      type: String,
      enum: {
        values: ['tenant', 'landlord', 'agent'],
        message: '❌ {VALUE} is not a valid role',
      },
      default: 'client',
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// ----------------------------
// Section 3: Middleware
// ----------------------------
/**
 * Pre-save hook for password hashing
 */
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(Number(process.env.BCRYPT_SALT_ROUNDS) || 10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(new Error('🔒 Password hashing failed: ' + error.message));
  }
});

// ----------------------------
// Section 4: Instance Methods
// ----------------------------
/**
 * Compare candidate password with user's hashed password
 */
userSchema.methods.matchPassword = async function (candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('🔒 Password comparison failed: ' + error.message);
  }
};

// ----------------------------
// Section 5: Model Export
// ----------------------------
const User = mongoose.model('User', userSchema);

module.exports = User;
