/**
 * Email Service Utility
 * ============================================
 * This module handles email sending via Brevo (formerly Sendinblue)
 * using Nodemailer in ALL environments (development and production).
 *
 * It verifies that all required environment variables are set,
 * and throws an error if any are missing.
 *
 * @module utils/email
 * @requires nodemailer
 * @requires dotenv
 */

require('dotenv').config();
const nodemailer = require('nodemailer');
const AppError = require('./appError');

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

/**
 * Create and configure the Brevo email transporter.
 * 
 * Required environment variables:
 *  - EMAIL_HOST (Brevo SMTP host)
 *  - EMAIL_PORT (Brevo SMTP port, usually 587)
 *  - EMAIL_USER (Brevo SMTP username)
 *  - EMAIL_PASS (Brevo SMTP password)
 * 
 * @returns {nodemailer.Transporter} Configured email transporter.
 */
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST, 
  port: Number(process.env.EMAIL_PORT), 
  auth: {
    user: process.env.EMAIL_USER,    
    pass: process.env.EMAIL_PASS     
  }
});

/**
 * Send an email using the configured Brevo transporter.
 * 
 * @async
 * @function sendEmail
 * @param {Object} options - Email options.
 * @param {string} options.email - Recipient's email address.
 * @param {string} options.subject - Email subject line.
 * @param {string} options.text - Plain text version of the email body.
 * @param {string} [options.html] - Optional HTML version of the email body.
 * @throws {AppError} If the email fails to send.
 * @returns {Promise<void>}
 */
const sendEmail = async (options) => {
  try {
    const mailOptions = {
      from: `Pandora Gardens <${process.env.EMAIL_FROM}>`,
      to: options.email,
      subject: options.subject,
      text: options.text,
      html: options.html
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${options.email}`);
  } catch (err) {
    console.error('💥 Email Error:', err);
    throw new AppError('There was an error sending the email', 500);
  }
};

module.exports = sendEmail;
