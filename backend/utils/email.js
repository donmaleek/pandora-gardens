require('dotenv').config();
const nodemailer = require('nodemailer');
const AppError = require('./appError');
// [FIX] Corrected import (remove curly braces)
const NodemailerExpressHandlebars = require('nodemailer-express-handlebars');
const path = require('path');

// Validate required environment variables
const requiredEnvVars = [
  'EMAIL_HOST',
  'EMAIL_PORT',
  'EMAIL_USER',
  'EMAIL_PASS',
  'EMAIL_FROM'
];

requiredEnvVars.forEach((varName) => {
  if (!process.env[varName]) {
    throw new Error(`❌ Missing required environment variable: ${varName}`);
  }
});

// Configure Nodemailer transporter for Brevo.
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Attach Handlebars templating to the transporter.
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

// [FIX] Remove 'new' keyword
transporter.use('compile', NodemailerExpressHandlebars(handlebarOptions));

// Send an email via Brevo with optional template support.
const sendEmail = async (options) => {
  try {
    const mailOptions = {
      from: `Pandora Gardens <${process.env.EMAIL_FROM}>`,
      to: options.to,
      subject: options.subject
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