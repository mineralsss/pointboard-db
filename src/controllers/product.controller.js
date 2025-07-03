const path = require('path');
const Product = require(path.resolve(__dirname, '../models/product.model.js'));
const APIError = require(path.resolve(__dirname, '../utils/APIError.js'));
const catchAsync = require(path.resolve(__dirname, '../utils/catchAsync.js'));

/**
 * Create a new product
 */
const createProduct = catchAsync(async (req, res) => {
  const productData = {
    ...req.body,
    createdBy: req.user.id,
    lastUpdatedBy: req.user.id,
  };
  
  const product = await Product.create(productData);
  
  res.status(201).json({
    success: true,
    data: product,
    message: 'Product created successfully',
  });
});

/**
 * Get all products with filtering, sorting, and pagination
 */
const getProducts = catchAsync(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    sort = '-createdAt',
    category,
    minPrice,
    maxPrice,
    search,
    isActive,
  } = req.query;
  
  // Build filter
  const filter = {};
  
  // Only show active products to non-admin users
  if (req.user?.role !== 'admin') {
    filter.isActive = true;
  } else if (isActive !== undefined) {
    filter.isActive = isActive === 'true';
  }
  
  if (category) {
    filter.category = category;
  }
  
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }
  
  // Text search
  if (search) {
    filter.$text = { $search: search };
  }
  
  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
    sort,
    populate: 'createdBy',
    select: '-__v',
  };
  
  const products = await Product.paginate(filter, options);
  
  res.status(200).json({
    success: true,
    data: products,
  });
});

/**
 * Get product by ID
 */
const getProductById = catchAsync(async (req, res) => {
  const product = await Product.findById(req.params.productId)
    .populate('createdBy', 'firstName lastName email')
    .populate('lastUpdatedBy', 'firstName lastName email');
  
  if (!product) {
    throw new APIError(404, 'Product not found');
  }
  
  // Check if product is active (unless user is admin)
  if (!product.isActive && req.user?.role !== 'admin') {
    throw new APIError(404, 'Product not found');
  }
  
  res.status(200).json({
    success: true,
    data: product,
  });
});

/**
 * Update product
 */
const updateProduct = catchAsync(async (req, res) => {
  const { productId } = req.params;
  
  // Don't allow updating createdBy
  delete req.body.createdBy;
  
  const updateData = {
    ...req.body,
    lastUpdatedBy: req.user.id,
  };
  
  const product = await Product.findByIdAndUpdate(
    productId,
    updateData,
    {
      new: true,
      runValidators: true,
    }
  );
  
  if (!product) {
    throw new APIError(404, 'Product not found');
  }
  
  res.status(200).json({
    success: true,
    data: product,
    message: 'Product updated successfully',
  });
});

/**
 * Delete product (soft delete by setting isActive to false)
 */
const deleteProduct = catchAsync(async (req, res) => {
  const { productId } = req.params;
  
  const product = await Product.findByIdAndUpdate(
    productId,
    {
      isActive: false,
      lastUpdatedBy: req.user.id,
    },
    { new: true }
  );
  
  if (!product) {
    throw new APIError(404, 'Product not found');
  }
  
  res.status(200).json({
    success: true,
    message: 'Product deleted successfully',
  });
});

/**
 * Get products by category
 */
const getProductsByCategory = catchAsync(async (req, res) => {
  const { category } = req.params;
  const { page = 1, limit = 10, sort = '-createdAt' } = req.query;
  
  const filter = {
    category,
    isActive: true,
  };
  
  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
    sort,
    populate: 'createdBy',
  };
  
  const products = await Product.paginate(filter, options);
  
  res.status(200).json({
    success: true,
    data: products,
  });
});

/**
 * Search products
 */
const searchProducts = catchAsync(async (req, res) => {
  const { q, page = 1, limit = 10 } = req.query;
  
  if (!q) {
    throw new APIError(400, 'Search query is required');
  }
  
  const filter = {
    $text: { $search: q },
    isActive: true,
  };
  
  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
    sort: { score: { $meta: 'textScore' } },
    populate: 'createdBy',
  };
  
  const products = await Product.paginate(filter, options);
  
  res.status(200).json({
    success: true,
    data: products,
  });
});

/**
 * Get featured products
 */
const getFeaturedProducts = catchAsync(async (req, res) => {
  const { limit = 8 } = req.query;
  
  const products = await Product.find({
    isActive: true,
    'rating.average': { $gte: 4 },
  })
    .sort('-salesCount -rating.average')
    .limit(parseInt(limit))
    .populate('createdBy', 'firstName lastName');
  
  res.status(200).json({
    success: true,
    data: products,
  });
});

/**
 * Update product stock
 */
const updateProductStock = catchAsync(async (req, res) => {
  const { productId } = req.params;
  const { quantity, operation = 'set' } = req.body;
  
  const product = await Product.findById(productId);
  
  if (!product) {
    throw new APIError(404, 'Product not found');
  }
  
  // Handle stock update based on operation
  if (operation === 'increment') {
    product.stock += quantity;
  } else if (operation === 'decrement') {
    if (product.stock !== -1 && product.stock < quantity) {
      throw new APIError(400, 'Insufficient stock');
    }
    if (product.stock !== -1) {
      product.stock -= quantity;
    }
  } else {
    product.stock = quantity;
  }
  
  product.lastUpdatedBy = req.user.id;
  await product.save();
  
  res.status(200).json({
    success: true,
    data: product,
    message: 'Stock updated successfully',
  });
});

module.exports = {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  getProductsByCategory,
  searchProducts,
  getFeaturedProducts,
  updateProductStock,
}; 