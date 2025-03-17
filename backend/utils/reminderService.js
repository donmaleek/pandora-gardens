const cron = require('node-cron');
const axios = require('axios');
const nodemailer = require('nodemailer');
const User = require('../models/User');

// ✅ Email transporter (for email reminders)
const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: 'your_email@gmail.com',
    pass: 'your_email_password',
  },
});

// ✅ Cron job: Runs daily at 8 AM
cron.schedule('0 8 * * *', async () => {
  console.log('🔔 Running daily rent reminder check...');

  try {
    const tenants = await User.find({ role: 'tenant' });

    tenants.forEach(async (tenant) => {
      const today = new Date();
      if (today.getDate() === 1) {
        // ✅ Send SMS (Placeholder - integrate with your SMS provider)
        await axios.post('https://sms-provider.com/api/send', {
          to: tenant.phone,
          message: `Hello ${tenant.name}, your rent for this month is due. Please make payment via Mpesa.`,
        });

        // ✅ Send Email
        await transporter.sendMail({
          from: '"Pandora Gardens" <no-reply@pandoragardens.com>',
          to: tenant.email,
          subject: 'Rent Payment Reminder',
          html: `<p>Dear ${tenant.name},</p>
            <p>This is a reminder that your monthly rent is due. Kindly make your payment through Mpesa.</p>
            <p>Thank you for staying with us!</p>`,
        });

        console.log(`✅ Reminder sent to ${tenant.name}`);
      }
    });
  } catch (err) {
    console.error('❌ Error sending reminders:', err);
  }
});
