const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: false // Có thể review cho order, không bắt buộc product
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: false
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    required: true
  },
  comment: {
    type: String,
    required: false
  },
  images: [{
    type: String // URL ảnh minh họa
  }],
  isApproved: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

const Review = mongoose.model('Review', reviewSchema);
module.exports = Review; 