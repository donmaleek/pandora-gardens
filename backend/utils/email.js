/*
 * Email Service Module (Gmail Optimized)
 * 
 * This module handles email sending functionality using Nodemailer with Handlebars templating.
 * Configured for Gmail with secure authentication.
 */

/* Load environment variables and required modules */
const crypto = require('crypto');
const stripHtml = require('strip-html');
require('dotenv').config();
const nodemailer = require('nodemailer');
const AppError = require('./appError');
const NodemailerExpressHandlebars = require('nodemailer-express-handlebars');
const path = require('path');
const Handlebars = require('handlebars');

// Register custom helper (keep your existing helper)
Handlebars.registerHelper('eq', (a, b) => a === b);

// Environment variables validation (add Gmail-specific check)
const requiredEnvVars = [
  'EMAIL_USER',    // Should be your full Gmail address
  'EMAIL_PASS',    // App password from Google
  'EMAIL_FROM'     // Should match EMAIL_USER
];

requiredEnvVars.forEach((varName) => {
  if (!process.env[varName]) {
    throw new Error(`❌ Missing required environment variable: ${varName}`);
  }
});

// Updated transporter configuration for Gmail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS // Should be 16 chars without spaces
  },
  secure: false, // Required for port 587
  tls: {
    ciphers: 'SSLv3', // Force modern encryption
    rejectUnauthorized: false // TEMPORARY for testing
  },
  logger: true // Add this for debug logs
});

// Keep your existing template configuration
const handlebarOptions = {
  viewEngine: {
    extname: '.hbs',
    layoutsDir: path.resolve(__dirname, '../emails/layouts'),
    partialsDir: path.resolve(__dirname, '../emails/partials'),
    defaultLayout: false,
  },
  viewPath: path.resolve(__dirname, '../emails/templates'),
  extName: '.hbs',
};

transporter.use('compile', NodemailerExpressHandlebars(handlebarOptions));

// Email sending function remains unchanged
const sendEmail = async (options) => {
  try {
    const mailOptions = {
      from: `Pandora Gardens <${process.env.EMAIL_FROM}>`,
      to: options.to,
      subject: options.subject,
    };

    if (options.templateName && options.templateData) {
      mailOptions.template = options.templateName;
      mailOptions.context = options.templateData;
    } else if (options.text) {
      mailOptions.text = options.text;
    } else {
      throw new AppError('Email must include either template or text content.', 400);
    }

    await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${options.to}`);
  } catch (err) {
    console.error('💥 Email Error:', err);
    throw new AppError(`Failed to send email: ${err.message}`, 500);
  }
};

module.exports = sendEmail;