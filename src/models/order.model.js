const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  productId: {
    type: String,
    required: true
  },
  productName: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  totalPrice: {
    type: Number,
    required: true,
    min: 0
  }
});

const orderSchema = new mongoose.Schema({
  orderRef: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  customerInfo: {
    firstName: {
      type: String,
      required: true
    },
    lastName: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true
    },
    phone: {
      type: String,
      required: true
    },
    address: {
      type: String,
      required: true
    }
  },
  items: [orderItemSchema],
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'VND'
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending',
    index: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending',
    index: true
  },
  paymentMethod: {
    type: String,
    enum: ['bank_transfer', 'sepay', 'vnpay', 'cash'],
    default: 'bank_transfer'
  },
  paymentDetails: {
    paymentId: String,
    gateway: String,
    transactionDate: String,
    transferAmount: Number,
    referenceCode: String,
    description: String
  },
  shippingInfo: {
    method: String,
    trackingNumber: String,
    estimatedDelivery: Date,
    actualDelivery: Date
  },
  notes: String,
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Add indexes for better query performance
orderSchema.index({ createdAt: -1 });
orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ status: 1, paymentStatus: 1 });
orderSchema.index({ 'customerInfo.email': 1 });

// Add text search index
orderSchema.index({ 
  orderRef: 'text', 
  'customerInfo.firstName': 'text',
  'customerInfo.lastName': 'text',
  'customerInfo.email': 'text',
  'items.productName': 'text'
});

// Virtual for full customer name
orderSchema.virtual('customerInfo.fullName').get(function() {
  return `${this.customerInfo.firstName} ${this.customerInfo.lastName}`;
});

// Pre-save middleware to generate order reference
orderSchema.pre('save', async function(next) {
  if (this.isNew && !this.orderRef) {
    // Generate unique order reference
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.orderRef = `PB${timestamp}${random}`;
  }
  next();
});

// Add plugins
orderSchema.plugin(require('./plugins/toJSON.plugin'));
orderSchema.plugin(require('./plugins/paginate.plugin'));

const Order = mongoose.model('Order', orderSchema);
module.exports = Order; 