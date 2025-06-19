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
    required: true,
    index: true  // Add index here
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
    required: true,
    index: true  // Add index here
  },
  transferAmount: { 
    type: Number, 
    required: true 
  },
  referenceCode: { 
    type: String, 
    required: true,
    index: true  // Add index here
  },
  accumulated: Number,
  status: {
    type: String,
    enum: ['pending', 'received', 'processing', 'completed', 'success', 'failed', 'rejected'],
    default: 'received',
    index: true  // Add index here
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true  // Add index here
  }
});

// Add text index for searching descriptions
transactionSchema.index({ description: 'text', content: 'text' });

// Add compound index for common query patterns
transactionSchema.index({ gateway: 1, transactionDate: -1 });

const Transaction = mongoose.model('Transaction', transactionSchema);
module.exports = Transaction;