const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  gateway: { 
    type: String, 
    required: true 
  },
  transactionDate: { 
    type: String, 
    required: true 
  },
  accountNumber: { 
    type: String, 
    required: true 
  },
  subAccount: String,
  code: String,
  content: String,
  transferType: { 
    type: String, 
    required: true 
  },
  description: { 
    type: String,
    required: true 
  },
  transferAmount: { 
    type: Number, 
    required: true 
  },
  referenceCode: { 
    type: String, 
    required: true 
  },
  accumulated: Number,
  status: {
    type: String,
    enum: ['pending', 'received', 'processing', 'completed', 'success', 'failed', 'rejected'],
    default: 'received'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Fixed: Changed model name from 'User' to 'Transaction'
const Transaction = mongoose.model('Transaction', transactionSchema);
module.exports = Transaction;