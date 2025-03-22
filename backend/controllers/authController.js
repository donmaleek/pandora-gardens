/**
 * Authentication Controller
 * @module controllers/authController
 * @description Provides comprehensive authentication services including:
 * - User registration & login
 * - Email verification
 * - Password reset workflows
 * - Two-Factor Authentication (2FA) via SMS
 * @requires bcryptjs Password hashing
 * @requires jsonwebtoken JWT management
 * @requires twilio SMS services
 */

// ==================== Environment Setup ====================
require('dotenv').config(); // Load environment variables

// ==================== Dependency Imports ====================
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const twilio = require('twilio');
 

// ==================== Custom Imports ====================
const User = require('../models/User');
const AppError = require('../utils/appError');
const sendEmail = require('../utils/email');
const logger = require('../utils/logger');

// ==================== Environment Validation ====================
const requiredEnvVars = [
  'TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN',
  'JWT_SECRET', 'FRONTEND_URL', 'JWT_EXPIRES_IN', 'SMS_SENDER_ID'
];

requiredEnvVars.forEach(envVar => {
  if (!process.env[envVar]) {
    logger.error(`CRITICAL: Missing environment variable ${envVar}`);
    process.exit(1); // Fail fast on missing config
  }
});

// ==================== Service Clients ====================
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// ==================== Core Authentication Functions ====================

/**
 * Generates a signed JWT token
 * @param {string|ObjectId} id - User's database ID
 * @returns {string} JWT token with expiration
 * @throws {Error} If JWT signing fails
 */
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

/**
 * Sends authentication response with user data and JWT
 * @param {Object} user - Mongoose user document
 * @param {number} statusCode - HTTP status code
 * @param {Response} res - Express response object
 */
const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  
  // Sanitize user data before sending to client
  const userData = {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
  };

  res.status(statusCode).json({
    status: 'success',
    token,
    data: { user: userData }
  });
};

// ==================== Controller Methods ====================

/**
 * @method register
 * @desc Registers a new user account
 * @flow 1. Validate input → 2. Check existing → 3. Hash password → 4. Create user
 * @param {Request} req - Express request with user data
 * @param {Response} res - Express response
 * @param {NextFunction} next - Error handler
 * @error {400} Missing fields or existing email
 * @error {500} Database operations failure
 */
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, phone } = req.body;

    // Input validation
    if (![name, email, password, phone].every(Boolean)) {
      return next(new AppError('All fields are required', 400));
    }

    // Existing user check
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(new AppError('Email is already registered', 400));
    }

    // Secure password hashing
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // User creation
    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      phone,
      isVerified: false, // Require email verification
    });

    createSendToken(newUser, 201, res);

  } catch (error) {
    logger.error(`Registration Error: ${error.stack}`);
    next(new AppError('User registration failed', 500));
  }
};

/**
 * @method login
 * @desc Authenticates user credentials
 * @flow 1. Validate input → 2. Fetch user → 3. Compare passwords → 4. Check verification
 * @param {Request} req - Express request with credentials
 * @param {Response} res - Express response
 * @param {NextFunction} next - Error handler
 * @error {400} Missing credentials
 * @error {401} Invalid credentials
 * @error {403} Unverified email
 */
exports.login = async (req, res, next) => {
  let user;
  try {
    const { email, password } = req.body;
    
    // Validate input presence
    if (!email || !password) {
      logger.warn('Missing credentials', {
        endpoint: '/login',
        ip: req.ip,
        emailPresent: !!email,
        passwordPresent: !!password
      });
      return next(new AppError('Please provide email and password', 400));
    }

    // Database connection check
    if (mongoose.connection.readyState !== 1) {
      logger.error('Database connection not ready', {
        state: mongoose.connection.readyState,
        dbName: mongoose.connection.name
      });
      return next(new AppError('Database connection error', 503));
    }

    // Find user with security fields
    user = await User.findOne({ email })
      .select('+password +loginAttempts +lockUntil +isVerified')
      .catch(err => {
        logger.error('Database query failed', {
          error: err.stack,
          query: { email }
        });
        throw new Error('Database operation failed');
      });

    // Account lock check
    if (user?.lockUntil && user.lockUntil > Date.now()) {
      const remaining = Math.ceil((user.lockUntil - Date.now()) / 60000);
      logger.warn('Account locked', {
        userId: user._id,
        attempts: user.loginAttempts,
        lockedUntil: user.lockUntil
      });
      return next(new AppError(`Account locked. Try again in ${remaining} minutes`, 403));
    }

    // Credential validation
    if (!user || !(await user.matchPassword(password))) {
      await user?.incrementLoginAttempts();
      logger.warn('Invalid credentials', {
        email,
        userId: user?._id,
        attemptCount: user?.loginAttempts || 0
      });
      return next(new AppError('Invalid credentials', 401));
    }

    // Email verification check
    if (!user.isVerified) {
      logger.warn('Unverified login attempt', { userId: user._id });
      return next(new AppError('Please verify your email first', 403));
    }

    // Reset login attempts on success
    await user.resetLoginAttempts();
    logger.info('Successful login', { userId: user._id });

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // Send response
    res.status(200).json({
      status: 'success',
      token,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      }
    });

  } catch (error) {
    // Comprehensive error logging
    logger.error('LOGIN PROCESS FAILURE', {
      error: error.stack,
      userExists: !!user,
      userId: user?._id,
      database: {
        connected: mongoose.connection.readyState === 1,
        dbName: mongoose.connection.name
      },
      environment: {
        jwtConfigured: !!process.env.JWT_SECRET,
        bcryptRounds: process.env.BCRYPT_SALT_ROUNDS || 12
      },
      request: {
        ip: req.ip,
        body: {
          email: req.body.email,
          passwordLength: req.body.password?.length
        }
      }
    });

    next(new AppError('Authentication system error', 500));
  }
};

// (Other methods follow similar documentation patterns)

// ==================== Security-Critical Methods ====================

/**
 * @method resetPassword
 * @desc Handles password reset with valid token
 * @security Uses crypto-strong token hashing and expiration
 * @param {Request} req - Express request with reset token
 * @param {Response} res - Express response
 * @param {NextFunction} next - Error handler
 * @error {400} Invalid/expired token
 */
exports.resetPassword = async (req, res, next) => {
  try {
    // Secure token comparison
    const hashedToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      logger.warn('Invalid password reset token attempt');
      return next(new AppError('Invalid or expired token', 400));
    }

    // Password update flow
    user.password = await bcrypt.hash(req.body.password, 12);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    
    await user.save(); // Explicit save for middleware hooks

    createSendToken(user, 200, res);

  } catch (error) {
    logger.error(`Password Reset Error: ${error.stack}`);
    next(new AppError('Error resetting password', 500));
  }
};

/**
 * @method send2FACode
 * @desc Generates and sends 2FA code via SMS
 * @integration Uses Twilio SMS API
 * @param {Request} req - Authenticated request
 * @param {Response} res - Express response
 * @param {NextFunction} next - Error handler
 * @error {404} User not found
 * @error {500} SMS service failure
 */
exports.send2FACode = async (req, res, next) => {
  let user;
  try {
    user = await User.findById(req.user.id);
    if (!user) return next(new AppError('User not found', 404));

    // OTP generation
    const otp = Math.floor(100000 + Math.random() * 900000);
    user.otp = otp.toString();
    user.otpExpires = Date.now() + 10 * 60 * 1000; // 10-minute expiry
    
    await user.save({ validateBeforeSave: false });

    // SMS delivery
    await twilioClient.messages.create({
      body: `Your verification code: ${otp}`,
      from: process.env.SMS_SENDER_ID,
      to: user.phone
    });

    res.status(200).json({
      status: 'success',
      message: '2FA code sent'
    });

  } catch (error) {
    // Cleanup on failure
    if (user) {
      user.otp = undefined;
      user.otpExpires = undefined;
      await user.save({ validateBeforeSave: false });
    }
    logger.error(`2FA SMS Failure: ${error.stack}`);
    next(new AppError('Error sending 2FA code', 500));
  }
};

// EMAIL VERIFICATION
exports.sendVerificationEmail = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return next(new AppError('User not found', 404));
    if (user.isVerified) return next(new AppError('Email already verified', 400));

    const verificationToken = signToken(user._id);
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

    await sendEmail({
      to: user.email,
      subject: 'Verify Your Email Address',
      templateName: 'emailVerification',
      templateData: {
        name: user.name,
        verificationUrl,
        email: user.email
      }
    });

    res.status(200).json({
      status: 'success',
      message: 'Verification email sent'
    });
  } catch (error) {
    logger.error('Verification email error:', error);
    next(new AppError('Error sending verification email', 500));
  }
};

exports.verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.query;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await User.findById(decoded.id);
    if (!user) return res.redirect(`${process.env.FRONTEND_URL}/verification-error?reason=user_not_found`);
    if (user.isVerified) return res.redirect(`${process.env.FRONTEND_URL}/verification-error?reason=already_verified`);

    user.isVerified = true;
    await user.save();

    res.redirect(`${process.env.FRONTEND_URL}/email-verified?success=true`);
  } catch (err) {
    logger.error('Email verification failed:', err);
    const reason = err.name === 'TokenExpiredError' ? 'expired' : 'invalid';
    res.redirect(`${process.env.FRONTEND_URL}/verification-error?reason=${reason}`);
  }
};

// PASSWORD RESET
exports.forgotPassword = async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) return next(new AppError('User with this email does not exist', 404));

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    user.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

    await user.save({ validateBeforeSave: false });

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    await sendEmail({
      to: user.email,
      subject: 'Password Reset Request',
      templateName: 'passwordReset',
      templateData: {
        name: user.name,
        resetUrl,
        expiry: 10 // minutes
      }
    });

    res.status(200).json({
      status: 'success',
      message: 'Password reset instructions sent to email'
    });
  } catch (error) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    logger.error('Password reset error:', error);
    next(new AppError('Error processing password reset', 500));
  }
};

// 2FA VERIFICATION
exports.verify2FA = async (req, res, next) => {
  try {
    const { code } = req.body;
    const user = await User.findById(req.user.id);
    
    if (!user || user.otp !== code || user.otpExpires < Date.now()) {
      return next(new AppError('Invalid or expired 2FA code', 401));
    }

    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    res.status(200).json({
      status: 'success',
      message: '2FA verification successful'
    });
  } catch (error) {
    logger.error('2FA verification failed:', error);
    next(new AppError('2FA verification failed', 400));
  }
};

