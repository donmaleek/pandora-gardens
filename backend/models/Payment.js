const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    mpesaReceiptNumber: {
      type: String,
    },
    transactionDate: {
      type: String,
    },
    status: {
      type: String,
      enum: ['Pending', 'Completed', 'Failed'],
      default: 'Pending',
    },
    checkoutRequestId: { 
      type: String, 
      unique: true  // No need to manually index this
    },
  },
  { timestamps: true }
);

// **Keep only necessary indexes**
paymentSchema.index({ phone: 1, createdAt: -1 });  // Compound index for phone history queries
paymentSchema.index({ status: 1 });  // Useful for filtering transactions by status

module.exports = mongoose.model('Payment', paymentSchema);
