const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  transactionId: {
    type: String,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  points: {
    type: Number,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  purchaseTime: {
    type: Date,
    default: () => {
      let now = new Date(); // Get current UTC date
      let offsetHours = 8; // Get Taipei offset from UTC
      let purchaseTime = new Date(now.setHours(now.getHours() + offsetHours));
      return purchaseTime;
    },
  },
  status: {
    type: String,
    enum: ['pending', 'success', 'failure', 'expired', 'cancelled'],
    default: 'pending',
  },
  expiryTime: {
    type: Date,
    required: true,
  },
  transactionRemark: {
    type: String,
  },
  orderDetails: {
    type: Object,
    required: true,
  },
  linePayTransactionId: {
    type: String,
  },
});

const Transaction = mongoose.model('Transaction', TransactionSchema);

module.exports = Transaction;
