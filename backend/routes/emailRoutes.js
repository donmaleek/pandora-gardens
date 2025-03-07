const express = require('express');
const router = express.Router();
const sendEmail = require('../utils/email');

// ✅ Test email route
router.post('/test', async (req, res) => {
  try {
    const { to } = req.body;

    await sendEmail({
      to,
      subject: '🚀 Test Email from Pandora Gardens',
      templateName: 'test',
      templateData: { name: 'Engineer', message: 'This is a test email.' }
    });

    res.status(200).json({ message: `✅ Test email sent to ${to}` });
  } catch (error) {
    console.error('❌ Test Email Failed:', error);
    res.status(500).json({ message: 'Failed to send test email', error: error.message });
  }
});

// ✅ Welcome email route
router.post('/welcome', async (req, res) => {
  try {
    const { to, name } = req.body;

    await sendEmail({
      to,
      subject: `🎉 Welcome to Pandora Gardens, ${name}!`,
      templateName: 'welcome',
      templateData: { name }
    });

    res.status(200).json({ message: `✅ Welcome email sent to ${to}` });
  } catch (error) {
    console.error('❌ Welcome Email Failed:', error);
    res.status(500).json({ message: 'Failed to send welcome email', error: error.message });
  }
});

// ✅ Password Reset email route
router.post('/reset-password', async (req, res) => {
  try {
    const { to, name, resetLink } = req.body;

    await sendEmail({
      to,
      subject: '🔑 Reset Your Pandora Gardens Password',
      templateName: 'resetPassword',
      templateData: { name, resetLink }
    });

    res.status(200).json({ message: `✅ Password reset email sent to ${to}` });
  } catch (error) {
    console.error('❌ Password Reset Email Failed:', error);
    res.status(500).json({ message: 'Failed to send password reset email', error: error.message });
  }
});

module.exports = router;
