const path = require('path');
const Order = require(path.resolve(__dirname, '../models/order.model.js'));
const APIError = require(path.resolve(__dirname, '../utils/APIError.js'));
const catchAsync = require(path.resolve(__dirname, '../utils/catchAsync.js'));

/**
 * Generate unique order number
 */
const generateOrderNumber = async () => {
  // Generate random letter (A-Z)
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const randomLetter = letters.charAt(Math.floor(Math.random() * letters.length));
  
  // Generate random 6-digit number
  const randomNumber = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
  
  return `POINTBOARD${randomLetter}${randomNumber}`;
};

/**
 * Create a new order - DEPRECATED
 * Use /api/orders/create-from-ref endpoint instead
 */
const createOrder = catchAsync(async (req, res) => {
  console.log('🚨 [DEPRECATED] Old createOrder endpoint called');
  console.log('Request body:', JSON.stringify(req.body, null, 2));
  
  return res.status(400).json({
    success: false,
    message: 'This endpoint is deprecated. Please use /api/orders/create-from-ref endpoint instead.',
    correctEndpoint: '/api/orders/create-from-ref',
    requiredFields: {
      orderRef: 'POINTBOARD[A-Z][0-9]{6}',
      transactionStatus: 'completed|pending|failed',
      paymentMethod: 'bank_transfer|cash|card',
      totalAmount: 'number',
      address: 'object (optional)',
      customerInfo: 'object (optional)',
      items: 'array (optional)'
    }
  });
});

/**
 * Get order by ID
 */
const getOrderById = catchAsync(async (req, res) => {
  const order = await Order.findById(req.params.orderId).populate('user', 'name email');
  
  if (!order) {
    throw new APIError(404, 'Order not found');
  }
  
  // Check if user owns this order or is admin
  if (order.user._id.toString() !== req.user.id && req.user.role !== 'admin') {
    throw new APIError(403, 'You do not have permission to view this order');
  }
  
  res.status(200).json({
    success: true,
    data: order,
  });
});

/**
 * Get user's orders
 */
const getUserOrders = catchAsync(async (req, res) => {
  const { page = 1, limit = 10, sortBy = 'createdAt:desc' } = req.query;
  
  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
    sortBy, // Use paginate plugin's sortBy format: 'field:order'
    populate: 'user', // Use string format for populate
  };
  
  const filter = { user: req.user.id };
  const orders = await Order.paginate(filter, options);
  
  res.status(200).json({
    success: true,
    data: orders,
  });
});

/**
 * Update order status (admin only)
 */
const updateOrderStatus = catchAsync(async (req, res) => {
  const { orderStatus, paymentStatus, status } = req.body;
  const { orderId } = req.params;
  
  console.log('updateOrderStatus called with:', { orderId, orderStatus, paymentStatus, status });
  
  const order = await Order.findById(orderId);
  
  if (!order) {
    console.log('Order not found for ID:', orderId);
    throw new APIError(404, 'Order not found');
  }
  
  console.log('Found order:', order._id);
  console.log('Current order status before update:', order.orderStatus);
  
  // Handle both 'orderStatus' and 'status' fields
  if (orderStatus) {
    console.log('Updating orderStatus with:', orderStatus);
    order.orderStatus = orderStatus;
  } else if (status) {
    console.log('Updating orderStatus with status field:', status);
    order.orderStatus = status;
  }
  
  if (paymentStatus) {
    console.log('Updating paymentStatus with:', paymentStatus);
    order.paymentStatus = paymentStatus;
  }
  
  console.log('Order status after assignment, before save:', order.orderStatus);
  console.log('Order modified paths:', order.modifiedPaths());
  console.log('Order isModified:', order.isModified());
  
  const savedOrder = await order.save();
  
  console.log('Order saved successfully');
  console.log('Saved order status:', savedOrder.orderStatus);
  console.log('Saved order ID:', savedOrder._id);
  
  // Double-check by fetching from database again
  const verifyOrder = await Order.findById(orderId);
  console.log('Verification - order status in DB:', verifyOrder.orderStatus);
  
  res.status(200).json({
    success: true,
    data: savedOrder,
    message: 'Order status updated successfully',
  });
});

/**
 * Cancel order
 */
const cancelOrder = catchAsync(async (req, res) => {
  const { orderId } = req.params;
  
  const order = await Order.findById(orderId);
  
  if (!order) {
    throw new APIError(404, 'Order not found');
  }
  
  // Check if user owns this order
  if (order.user.toString() !== req.user.id && req.user.role !== 'admin') {
    throw new APIError(403, 'You do not have permission to cancel this order');
  }
  
  // Check if order can be cancelled
  if (['shipped', 'delivered', 'cancelled'].includes(order.orderStatus)) {
    throw new APIError(400, 'Order cannot be cancelled in its current status');
  }
  
  order.orderStatus = 'cancelled';
  await order.save();
  
  res.status(200).json({
    success: true,
    data: order,
    message: 'Order cancelled successfully',
  });
});

/**
 * Get all orders (admin only)
 */
const getAllOrders = catchAsync(async (req, res) => {
  const { page = 1, limit = 10, status, sortBy = 'createdAt:desc' } = req.query;
  
  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
    sortBy, // Use paginate plugin's sortBy format: 'field:order'
    populate: 'user', // Use string format for populate
  };
  
  const filter = {};
  if (status) {
    filter.orderStatus = status;
  }
  
  const orders = await Order.paginate(filter, options);
  
  res.status(200).json({
    success: true,
    data: orders,
  });
});

module.exports = {
  createOrder,
  getOrderById,
  getUserOrders,
  updateOrderStatus,
  cancelOrder,
  getAllOrders,
}; 