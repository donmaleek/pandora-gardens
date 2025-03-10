const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/appError');
const sendEmail = require('../utils/email');

// Helper: Sign JWT
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

// Helper: Send Response with Token
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

// REGISTER
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role, phone } = req.body;

    if (!name || !email || !password || !phone) {
      return next(
        new AppError('Please provide name, email, password, and phone number', 400)
      );
    }

    const newUser = await User.create({
      name,
      email,
      password,
      phone,
      role: role || 'client',
    });

    // Attempt to send Welcome Email
    try {
      await sendEmail({
        to: newUser.email,
        subject: 'Welcome to Pandora Gardens!',
        templateName: 'welcomeEmail', // matches templateName in sendEmail.js
        templateData: {
          name: newUser.name,
        },
      });
    } catch (error) {
      console.error(`⚠️ Email sending failed for ${newUser.email}:`, error.message);
    }

    createSendToken(newUser, 201, res);
  } catch (err) {
    if (err.code === 11000) {
      return next(new AppError('Email already exists', 409));
    }
    next(err);
  }
};

// LOGIN
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return next(new AppError('Please provide email and password', 400));
    }

    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.matchPassword(password))) {
      return next(new AppError('Incorrect email or password', 401));
    }

    createSendToken(user, 200, res);
  } catch (err) {
    next(err);
  }
};

// FORGOT PASSWORD
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return next(new AppError('No user found with that email', 404));
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    user.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

    await user.save({ validateBeforeSave: false });

    const resetURL = `${req.protocol}://${req.get(
      'host'
    )}/api/v1/auth/reset-password/${resetToken}`;

    try {
      await sendEmail({
        to: user.email, // Ensure consistency with sendEmail function
        subject: 'Password Reset (valid for 10 minutes)',
        templateName: 'resetPasswordEmail', // Matches resetPasswordEmail.hbs
        templateData: {
          resetURL, // Include the reset link inside the template
          name: user.name, // Pass user's name for personalization
        },
      });

      res.status(200).json({
        status: 'success',
        message: 'Token sent to email!',
      });
    } catch (err) {
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save({ validateBeforeSave: false });

      return next(new AppError('Error sending email. Try again later!', 500));
    }
  } catch (err) {
    next(err);
  }
};
