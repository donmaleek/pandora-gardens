const mongoose = require('mongoose');

const emailLogSchema = new mongoose.Schema({
  to: String,
  subject: String,
  status: String,
  error: String,
  sentAt: Date
});

module.exports = mongoose.model('EmailLog', emailLogSchema);
