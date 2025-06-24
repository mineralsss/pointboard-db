const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    category: {
      type: String,
      required: true,
      enum: ['course', 'ebook', 'software', 'service', 'other'],
    },
    subcategory: {
      type: String,
      trim: true,
    },
    images: [{
      type: String,
    }],
    thumbnail: {
      type: String,
      default: 'https://via.placeholder.com/300x200?text=No+Image',
    },
    stock: {
      type: Number,
      default: -1, // -1 means unlimited stock (for digital products)
      min: -1,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    features: [{
      type: String,
    }],
    specifications: {
      type: Map,
      of: String,
    },
    tags: [{
      type: String,
      lowercase: true,
      trim: true,
    }],
    rating: {
      average: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
      },
      count: {
        type: Number,
        default: 0,
      },
    },
    salesCount: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    lastUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Add text index for search
productSchema.index({ name: 'text', description: 'text', tags: 'text' });

// Add compound index for filtering
productSchema.index({ category: 1, isActive: 1, price: 1 });

// Add plugins
productSchema.plugin(require("./plugins/toJSON.plugin"));
productSchema.plugin(require("./plugins/paginate.plugin"));

// Virtual for formatted price
productSchema.virtual('formattedPrice').get(function() {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(this.price);
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product; 