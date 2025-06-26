const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    orderNumber: {
      type: String,
      required: true,
      unique: true,
    },
    items: [{
      productId: String,
      productName: String,
      quantity: Number,
      price: Number,
    }],
    totalAmount: {
      type: Number,
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ['bank_transfer', 'cash', 'card'],
      default: 'bank_transfer',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'refunded'],
      default: 'pending',
    },
    orderStatus: {
      type: String,
      enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
      default: 'pending',
    },
    shippingAddress: {
      fullName: String,
      phone: String,
      address: String,
      city: String,
      district: String,
      ward: String,
      notes: String,
    },
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction',
    },
    paymentDetails: {
      gateway: String,
      transactionDate: String,
      transferAmount: Number,
      referenceCode: String,
      accountNumber: String,
    },
    notes: String,
  },
  {
    timestamps: true,
  }
);

// Add plugins
orderSchema.plugin(require("./plugins/toJSON.plugin"));
orderSchema.plugin(require("./plugins/paginate.plugin"));

const Order = mongoose.model('Order', orderSchema);

module.exports = Order; 