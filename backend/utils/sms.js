require('dotenv').config();
const twilio = require('twilio');
const AppError = require('./appError');
const { validatePhoneNumber } = require('./validators'); // Create this validator

// 🔒 Environment Validation
const requiredEnvVars = [
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'SMS_SENDER_ID'
];

requiredEnvVars.forEach((varName) => {
  if (!process.env[varName]) {
    throw new Error(`❌ Missing required SMS environment variable: ${varName}`);
  }
});

// 🔐 Initialize Twilio Client
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// 📱 SMS Sender with Security Features
const sendSMS = async (options) => {
  try {
    // Input Validation
    if (!validatePhoneNumber(options.to)) {
      throw new AppError('Invalid recipient phone number', 400);
    }

    if (!options.message || options.message.length > 160) {
      throw new AppError('Message must be 1-160 characters', 400);
    }

    // Production/Development Handling
    if (process.env.NODE_ENV === 'production') {
      const message = await client.messages.create({
        body: options.message,
        from: process.env.SMS_SENDER_ID,
        to: options.to,
        validityPeriod: 600, // 10 minutes
        smartEncoded: true // Auto-detect special characters
      });

      return {
        status: 'success',
        messageSid: message.sid,
        cost: message.price,
        dateCreated: message.dateCreated
      };
    } else {
      // Development mode - log instead of sending
      console.log(`📲 SMS Preview (${options.to}): ${options.message}`);
      return {
        status: 'success',
        message: 'SMS logged in development mode'
      };
    }
  } catch (err) {
    console.error('💥 SMS Error:', {
      to: options.to,
      error: err.message
    });
    throw new AppError(`SMS delivery failed: ${err.message}`, 500);
  }
};

// 🛡️ Enhanced SMS Features
module.exports = {
  sendSMS,
  // Optional SMS Helper Methods
  validatePhoneNumber: (phone) => {
    const regex = /^\+?[1-9]\d{1,14}$/; // E.164 format
    return regex.test(phone);
  },
  formatPhoneNumber: (phone) => {
    return phone.startsWith('+') ? phone : `+${phone}`;
  }
};