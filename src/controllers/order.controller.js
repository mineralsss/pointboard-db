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
 * Create a new order
 */
const createOrder = catchAsync(async (req, res) => {
  const { items, totalAmount, paymentMethod, shippingAddress, notes, transactionReference } = req.body;
  
  let orderNumber = null;
  let paymentStatus = 'pending';
  let paymentDetails = null;
  let transactionId = null;
  
  console.log('🔍 CreateOrder input:', { paymentMethod, transactionReference });
  
  // If transactionReference is provided, use it as orderNumber regardless of payment method
  if (transactionReference && transactionReference.match(/^POINTBOARD[A-Z][0-9]{6}$/i)) {
    orderNumber = transactionReference.toUpperCase();
    console.log(`✅ Using transactionReference as orderNumber: ${orderNumber}`);
    
    // For bank transfer, try to find existing transaction to get payment status
    if (paymentMethod === 'bank_transfer') {
      const Transaction = require(path.resolve(__dirname, '../models/transaction.model.js'));
      
      console.log('🏦 Bank transfer: Looking for transaction...');
      
      // Try to find transaction by referenceCode first
      let transaction = await Transaction.findOne({ referenceCode: transactionReference });
      
      // If not found, try to find by content containing the reference
      if (!transaction) {
        transaction = await Transaction.findOne({
          content: { $regex: transactionReference, $options: 'i' }
        });
      }
      
      // If not found, try to find by description containing the reference
      if (!transaction) {
        transaction = await Transaction.findOne({
          description: { $regex: transactionReference, $options: 'i' }
        });
      }
      
      if (transaction) {
        console.log('✅ Transaction found:', transaction._id);
        
        // Check if transaction is completed and update payment status
        if (transaction.status === 'received' || transaction.status === 'completed' || transaction.status === 'success') {
          paymentStatus = 'completed';
          transactionId = transaction._id;
          paymentDetails = {
            gateway: transaction.gateway,
            transactionDate: transaction.transactionDate,
            transferAmount: transaction.transferAmount,
            referenceCode: transaction.referenceCode,
            accountNumber: transaction.accountNumber,
          };
          console.log('✅ Transaction completed, setting payment status to completed');
        } else {
          console.log('⚠️ Transaction found but not completed, payment status remains pending');
        }
      } else {
        console.log('⚠️ No transaction found in database, but using reference as orderNumber anyway');
      }
    } else {
      console.log('💰 Cash payment: Using reference as orderNumber without transaction lookup');
    }
  }
  
  // If no orderNumber found from transaction reference, generate a new one
  if (!orderNumber) {
    orderNumber = await generateOrderNumber();
    console.log('🆕 Generated new orderNumber:', orderNumber);
  }
  
  console.log('📦 Final values:');
  console.log('- OrderNumber:', orderNumber);
  console.log('- Payment method:', paymentMethod);
  console.log('- Payment status:', paymentStatus);
  console.log('- TransactionId:', transactionId);
  
  // Transform items to ensure consistent structure
  const transformedItems = items.map(item => ({
    productId: item.productId || item.id || orderNumber + '-' + Math.random().toString(36).substr(2, 9),
    productName: item.productName || item.name || 'Product',
    quantity: item.quantity || 1,
    price: item.price || item.amount || 0,
  }));
  
  // Create the order
  const order = await Order.create({
    user: req.user.id,
    orderNumber,
    items: transformedItems,
    totalAmount,
    paymentMethod: paymentMethod || 'bank_transfer',
    shippingAddress: shippingAddress || {
      fullName: req.user.firstName + ' ' + req.user.lastName,
      phone: req.user.phoneNumber || '',
      address: req.user.address || '',
      city: 'Ho Chi Minh',
      district: 'District 1',
      ward: '',
      notes: '',
    },
    notes: notes || '',
    paymentStatus: paymentStatus,
    orderStatus: paymentStatus === 'completed' ? 'confirmed' : 'pending',
    transactionId: transactionId,
    paymentDetails: paymentDetails,
  });
  
  console.log('✅ Order created successfully:', order.orderNumber);
  
  res.status(201).json({
    success: true,
    data: order,
    message: paymentStatus === 'completed' ? 'Order created successfully with payment confirmed' : `Order created successfully (${paymentMethod} payment)`,
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