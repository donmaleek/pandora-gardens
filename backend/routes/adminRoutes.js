const express = require('express');
const router = express.Router();
const Payment = require('../models/Payment');

// ✅ Get all payments (for admin)
router.get('/payments', async (req, res) => {
  try {
    const payments = await Payment.find().sort({ createdAt: -1 });
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

module.exports = router;
