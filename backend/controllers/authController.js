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
    const { name, email, password, phone, role } = req.body;

    // Input validation
    if (![name, email, password, phone, role].every(Boolean)) {
      return next(new AppError('All fields are required', 400));
    }

    // Check if the user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(new AppError('Email is already registered', 400));
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create a new user
    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      phone,
      role,
      isVerified: false,
    });

    // Generate a JWT token
    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN,
    });

    // Send the response
    res.status(201).json({
      status: 'success',
      token,
      data: {
        user: {
          id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          phone: newUser.phone,
          role: newUser.role,
        },
      },
    });
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
  let user; // Declare user in outer scope for error handling
  
  try {
    console.log('\n=== NEW LOGIN ATTEMPT ===');
    console.log('Request headers:', req.headers);
    console.log('Request body:', { 
      email: req.body.email,
      password: req.body.password ? `[length: ${req.body.password.length}]` : 'missing'
    });

    // Environment check
    console.log('Environment checks:', {
      JWT_SECRET: !!process.env.JWT_SECRET,
      NODE_ENV: process.env.NODE_ENV,
      DB_READY_STATE: mongoose.connection.readyState
    });

    const { email, password } = req.body;
    if (!email || !password) {
      console.log('🚫 Missing credentials:', { emailExists: !!email, passwordExists: !!password });
      return next(new AppError('Invalid credentials', 401));
    }

    // Database query with error handling
    try {
      user = await User.findOne({ email: email.toLowerCase() })
        .select('+password +isVerified +loginAttempts +lockUntil');
        
      console.log('🔍 User query result:', user ? `Found user ${user._id}` : 'No user found');
    } catch (dbError) {
      console.error('🚨 Database query failed:', dbError.message);
      throw dbError;
    }

    if (!user) {
      console.log('❌ No user found for email:', email);
      return next(new AppError('Invalid credentials', 401));
    }

    // Account lock check
    if (user.lockUntil && user.lockUntil > Date.now()) {
      const remainingTime = Math.ceil((user.lockUntil - Date.now()) / 60000);
      console.log('🔒 Account locked:', {
        userId: user._id,
        attempts: user.loginAttempts,
        lockUntil: new Date(user.lockUntil).toISOString(),
        remaining: `${remainingTime} minutes`
      });
      return res.status(403).json({
        status: 'error',
        code: 'ACCOUNT_LOCKED',
        message: `Account temporarily locked. Try again in ${remainingTime} minutes`,
        retryAfter: remainingTime * 60
      });
    }

    // Password verification
    console.log('🔐 Password check:', {
      inputPassword: `[length: ${password.length}]`,
      storedHash: user.password ? `[length: ${user.password.length}]` : 'missing'
    });

    let isMatch = false;
    try {
      isMatch = await bcrypt.compare(password, user.password);
      console.log('✅ Password comparison result:', isMatch);
    } catch (bcryptError) {
      console.error('🚨 Bcrypt comparison failed:', bcryptError.message);
      throw bcryptError;
    }

    if (!isMatch) {
      console.log('🔒 Password mismatch - incrementing attempts');
      try {
        await user.incrementLoginAttempts();
        console.log('📈 Login attempts increased to:', user.loginAttempts + 1);
      } catch (lockError) {
        console.error('🚨 Failed to increment attempts:', lockError.message);
      }
      return next(new AppError('Invalid credentials', 401));
    }

    // Verification check
    if (!user.isVerified) {
      console.log('📧 Unverified account:', {
        userId: user._id,
        verificationStatus: user.isVerified
      });
      return next(new AppError('Please verify email first', 403));
    }

    // JWT generation
    console.log('🔑 Generating JWT with:', {
      userId: user._id,
      secretExists: !!process.env.JWT_SECRET,
      expiresIn: process.env.JWT_EXPIRES_IN
    });

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // Reset attempts
    try {
      await user.resetLoginAttempts();
      console.log('🔄 Reset login attempts for:', user._id);
    } catch (resetError) {
      console.error('🚨 Failed to reset attempts:', resetError.message);
    }

    console.log('🎉 Successful login:', {
      userId: user._id,
      tokenPreview: token.slice(0, 20) + '...'
    });

    res.status(200).json({
      status: 'success',
      token,
      data: { user: { id: user._id, name: user.name, email: user.email, role: user.role } }
    });

  } catch (error) {
    console.error('🚨 CRITICAL ERROR:', {
      message: error.message,
      stack: error.stack,
      systemState: {
        userExists: !!user,
        userId: user?._id,
        dbConnected: mongoose.connection.readyState === 1,
        memoryUsage: process.memoryUsage()
      }
    });

    logger.error('LOGIN PROCESS FAILURE', {
      error: error.stack,
      userState: user ? {
        _id: user._id,
        attempts: user.loginAttempts,
        locked: !!(user.lockUntil && user.lockUntil > Date.now())
      } : 'no-user-found',
      requestDetails: {
        ip: req.ip,
        headers: req.headers,
        body: { email: req.body.email }
      }
    });

    next(new AppError('Authentication system error', 500));
  }
};

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
  to: newUser.email,
  subject: 'Confirm Your Pandora Gardens Account',
  templateName: 'verification',
  templateData: {
    name: newUser.name,
    verificationUrl: `${process.env.FRONTEND_URL}/verify-email?token=${verifyToken}`,
    year: new Date().getFullYear(),
    legalAddress: process.env.LEGAL_ADDRESS,
    supportEmail: process.env.SUPPORT_EMAIL,
    unsubscribeUrl: process.env.UNSUBSCRIBE_URL,
    privacyUrl: process.env.PRIVACY_POLICY_URL
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