const nodemailer = require('nodemailer');
const twilio = require('twilio');

// Configure email transport (Update with your SMTP credentials)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

/**
 * Send an email notification
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} text - Email body
 */
const sendEmail = async (to, subject, text) => {
    try {
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to,
            subject,
            text
        });
        console.log(`📧 Email sent to ${to}`);
    } catch (error) {
        console.error(`❌ Error sending email: ${error.message}`);
    }
};

// Twilio Configuration
const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);

/**
 * Send an SMS notification
 * @param {string} phone - Recipient phone number
 * @param {string} message - SMS body
 */
const sendSMS = async (phone, message) => {
    try {
        await client.messages.create({
            body: message,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: phone
        });
        console.log(`📱 SMS sent to ${phone}`);
    } catch (error) {
        console.error(`❌ Error sending SMS: ${error.message}`);
    }
};

module.exports = { sendEmail, sendSMS };
