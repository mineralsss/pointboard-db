const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    transactionId: String,
    orderRef: String,
    gateway: String,
    amount: Number,
    content: String,
    referenceCode: String,
    status: String,
    rawData: Object,
    requestIP: String
  },
  { timestamps: true }
);

const Transaction = mongoose.model('Transaction', transactionSchema);
module.exports = Transaction;