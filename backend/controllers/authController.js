const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/appError');
const sendEmail = require('../utils/email');
const twilio = require('twilio'); // Added for SMS

// Initialize Twilio client
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Helper: Sign JWT (unchanged)
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

// Helper: Send Response with Token (unchanged)
const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    },
  });
};

// REGISTER (unchanged)
exports.register = async (req, res, next) => { /* ... existing code ... */ };

// LOGIN (unchanged)
exports.login = async (req, res, next) => { /* ... existing code ... */ };

// FORGOT PASSWORD (unchanged)
exports.forgotPassword = async (req, res, next) => { /* ... existing code ... */ };

// =================================================================
// 🔥 VERIFICATION & 2FA CONTROLLERS (UPDATED)
// =================================================================

exports.sendVerificationEmail = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return next(new AppError('User not found', 404));
    if (user.isVerified) return next(new AppError('Email already verified', 400));

    const verificationToken = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

    await sendEmail({
      to: user.email,
      subject: 'Verify Your Email Address',
      templateName: 'emailVerification',
      templateData: {
        name: user.name,
        verificationUrl,
        email: user.email,
        unsubscribeUrl: `${process.env.FRONTEND_URL}/unsubscribe`,
        privacyPolicyUrl: `${process.env.FRONTEND_URL}/privacy`,
        termsUrl: `${process.env.FRONTEND_URL}/terms`
      }
    });

    res.status(200).json({
      status: 'success',
      message: 'Verification email sent'
    });
  } catch (error) {
    return next(new AppError('Error sending verification email', 500));
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
    const reason = err.name === 'TokenExpiredError' ? 'expired' : 'invalid';
    res.redirect(`${process.env.FRONTEND_URL}/verification-error?reason=${reason}`);
  }
};

exports.send2FACode = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return next(new AppError('User not found', 404));

    const otp = Math.floor(100000 + Math.random() * 900000);
    user.otp = otp.toString();
    user.otpExpires = Date.now() + 10 * 60 * 1000;
    
    await user.save({ validateBeforeSave: false });

    // Actual SMS sending
    await twilioClient.messages.create({
      body: `Your Pandora Gardens verification code: ${otp}`,
      from: process.env.SMS_SENDER_ID,
      to: user.phone
    });

    res.status(200).json({
      status: 'success',
      message: '2FA code sent'
    });
  } catch (error) {
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save({ validateBeforeSave: false });
    return next(new AppError('Error sending 2FA code', 500));
  }
};

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
    return next(new AppError('2FA verification failed', 400));
  }
};