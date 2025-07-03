const path = require('path');
const Order = require(path.resolve(__dirname, '../models/order.model.js'));
const APIError = require(path.resolve(__dirname, '../utils/APIError.js'));
const catchAsync = require(path.resolve(__dirname, '../utils/catchAsync.js'));

/**
 * Generate unique order number
 */
const generateOrderNumber = async () => {
  let orderNumber;
  let isUnique = false;
  let attempts = 0;
  const maxAttempts = 10;
  
  while (!isUnique && attempts < maxAttempts) {
    // Generate random letter (A-Z)
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const randomLetter = letters.charAt(Math.floor(Math.random() * letters.length));
    
    // Generate random 6-digit number
    const randomNumber = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    
    orderNumber = `POINTBOARD${randomLetter}${randomNumber}`;
    
    // Check if this order number already exists (case-insensitive)
    const existingOrder = await Order.findOne({ 
      orderNumber: { $regex: new RegExp(`^${orderNumber}$`, 'i') }
    });
    
    if (!existingOrder) {
      isUnique = true;
      console.log('🎯 [GENERATE ORDER NUMBER] Generated unique order number:', orderNumber);
    } else {
      console.log('⚠️ [GENERATE ORDER NUMBER] Collision detected:', orderNumber, 'Attempt:', attempts + 1);
    }
    
    attempts++;
  }
  
  if (!isUnique) {
    throw new Error('Unable to generate unique order number after maximum attempts');
  }
  
  return orderNumber;
};

/**
 * Create a new order with generated order number
 */
const createOrder = catchAsync(async (req, res) => {
  try {
    const {
      items,
      totalAmount,
      paymentMethod = 'bank_transfer',
      shippingAddress,
      notes,
      customerInfo,
      useCalculatedTotal = false, // New parameter to use calculated total instead of provided total
      includeVAT = true, // New parameter to include VAT in calculations
      vatRate = 0.10 // VAT rate (10% = 0.10)
    } = req.body;
    
    console.log('📦 [CREATE ORDER] Creating order with data:', {
      totalAmount,
      paymentMethod,
      hasItems: !!items,
      itemsLength: items?.length || 0
    });
    
    // Validate required fields
    if (!totalAmount || totalAmount <= 0) {
      throw new APIError(400, 'totalAmount is required and must be greater than 0');
    }
    
    if (!items || items.length === 0) {
      throw new APIError(400, 'items are required');
    }
    
    // Generate unique order number
    const orderNumber = await generateOrderNumber();
    console.log('🎯 [CREATE ORDER] Generated order number:', orderNumber);
    
    // Calculate subtotal from items (without VAT)
    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    // Calculate VAT amount
    const vatAmount = includeVAT ? subtotal * vatRate : 0;
    
    // Calculate total with VAT
    const calculatedTotal = subtotal + vatAmount;
    
    console.log('💰 [CREATE ORDER] Price breakdown:', {
      subtotal: subtotal,
      vatRate: vatRate,
      vatAmount: vatAmount,
      calculatedTotal: calculatedTotal,
      providedTotal: totalAmount,
      includeVAT: includeVAT
    });
    
    // Determine which total to use
    let finalTotal = totalAmount;
    if (useCalculatedTotal) {
      finalTotal = calculatedTotal;
      console.log('💰 [CREATE ORDER] Using calculated total:', calculatedTotal);
    } else {
      // Validate total amount matches calculated total (with tolerance for floating point precision)
      const tolerance = 0.01; // 1 cent tolerance
      if (Math.abs(calculatedTotal - totalAmount) > tolerance) {
        console.log('💰 [CREATE ORDER] Amount mismatch:', {
          provided: totalAmount,
          calculated: calculatedTotal,
          subtotal: subtotal,
          vatAmount: vatAmount,
          difference: Math.abs(calculatedTotal - totalAmount)
        });
        throw new APIError(400, `Total amount (${totalAmount}) does not match the calculated total (${calculatedTotal}). Subtotal: ${subtotal}, VAT (${vatRate * 100}%): ${vatAmount.toFixed(2)}. Difference: ${Math.abs(calculatedTotal - totalAmount).toFixed(2)}`);
      }
    }
    
    // Prepare order data
    const orderData = {
      user: req.user.id,
      orderNumber: orderNumber,
      items: items,
      totalAmount: finalTotal,
      subtotal: subtotal,
      vatAmount: vatAmount,
      vatRate: vatRate,
      paymentMethod: paymentMethod,
      shippingAddress: {
        fullName: customerInfo?.fullName || customerInfo?.name || shippingAddress?.fullName || 'Customer',
        phone: customerInfo?.phone || shippingAddress?.phone || '',
        address: shippingAddress?.address || shippingAddress?.street || '',
        city: shippingAddress?.city || 'Ho Chi Minh',
        district: shippingAddress?.district || 'District 1',
        ward: shippingAddress?.ward || '',
        notes: shippingAddress?.notes || ''
      },
      notes: notes || '',
      paymentStatus: 'pending',
      orderStatus: 'pending'
    };
    
    console.log('📦 [CREATE ORDER] Final order data:', {
      orderNumber: orderData.orderNumber,
      totalAmount: orderData.totalAmount,
      subtotal: orderData.subtotal,
      vatAmount: orderData.vatAmount,
      vatRate: orderData.vatRate,
      calculatedTotal: calculatedTotal,
      providedTotal: totalAmount,
      useCalculatedTotal: useCalculatedTotal,
      itemsCount: orderData.items.length
    });
    
    // Create the order
    const order = await Order.create(orderData);
    
    console.log('✅ [CREATE ORDER] Order created successfully:', {
      orderNumber: order.orderNumber,
      totalAmount: order.totalAmount
    });
    
    return res.status(201).json({
      success: true,
      data: {
        order: order,
        paymentCode: orderNumber, // This is the code to show on payment
        message: `Order created successfully. Use order number ${orderNumber} for payment.`
      }
    });
    
  } catch (error) {
    console.error('[CREATE ORDER] Error:', error);
    throw error;
  }
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
 * Get user's orders - Sorted by date (newest first)
 */
const getUserOrders = catchAsync(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;
  
  const filter = { user: req.user.id };
  
  // First, get total count for pagination info
  const totalResults = await Order.countDocuments(filter);
  const totalPages = Math.ceil(totalResults / limitNum);
  
  // Get user's orders sorted by date (newest first) with pagination
  let ordersQuery = Order.find(filter)
    .sort({ createdAt: -1 }) // Sort by newest first
    .skip(skip)
    .limit(limitNum)
    .populate('user', 'firstName lastName email'); // Populate user info
  
  const results = await ordersQuery.exec();
  
  // Create pagination response object
  const orders = {
    page: pageNum,
    limit: limitNum,
    totalPages,
    totalResults,
    results,
  };
  
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
 * Get all orders (admin only) - Globally sorted by date
 */
const getAllOrders = catchAsync(async (req, res) => {
  const { page = 1, limit = 10, status, paymentStatus, search, startDate, endDate } = req.query;
  
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;
  
  // Build filter
  const filter = {};
  
  // Status filter
  if (status) {
    filter.orderStatus = status;
  }
  
  // Payment status filter
  if (paymentStatus) {
    filter.paymentStatus = paymentStatus;
  }
  
  // Date range filter
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) {
      filter.createdAt.$gte = new Date(startDate);
    }
    if (endDate) {
      filter.createdAt.$lte = new Date(endDate);
    }
  }
  
  // Search filter (search in order number, user email, or product names)
  if (search) {
    const searchRegex = new RegExp(search, 'i');
    filter.$or = [
      { orderNumber: searchRegex },
      { 'items.productName': searchRegex }
    ];
  }
  
  // First, get total count for pagination info
  const totalResults = await Order.countDocuments(filter);
  const totalPages = Math.ceil(totalResults / limitNum);
  
  // Get all orders sorted by date (newest first) with pagination
  let ordersQuery = Order.find(filter)
    .sort({ createdAt: -1 }) // Sort by newest first
    .skip(skip)
    .limit(limitNum)
    .populate('user', 'firstName lastName email'); // Populate user info
  
  const results = await ordersQuery.exec();
  
  // Create pagination response object
  const orders = {
    page: pageNum,
    limit: limitNum,
    totalPages,
    totalResults,
    results,
    filters: {
      status,
      paymentStatus,
      search,
      startDate,
      endDate
    }
  };
  
  res.status(200).json({
    success: true,
    data: orders,
  });
});

/**
 * Get order statistics for admin dashboard
 */
const getOrderStats = catchAsync(async (req, res) => {
  const { startDate, endDate } = req.query;
  
  // Build date filter
  const dateFilter = {};
  if (startDate || endDate) {
    dateFilter.createdAt = {};
    if (startDate) {
      dateFilter.createdAt.$gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.createdAt.$lte = new Date(endDate);
    }
  }
  
  // Get total orders
  const totalOrders = await Order.countDocuments(dateFilter);
  
  // Get orders by status
  const ordersByStatus = await Order.aggregate([
    { $match: dateFilter },
    {
      $group: {
        _id: '$orderStatus',
        count: { $sum: 1 },
        totalAmount: { $sum: '$totalAmount' }
      }
    }
  ]);
  
  // Get orders by payment status
  const ordersByPaymentStatus = await Order.aggregate([
    { $match: dateFilter },
    {
      $group: {
        _id: '$paymentStatus',
        count: { $sum: 1 },
        totalAmount: { $sum: '$totalAmount' }
      }
    }
  ]);
  
  // Get total revenue
  const totalRevenue = await Order.aggregate([
    { $match: { ...dateFilter, paymentStatus: 'completed' } },
    {
      $group: {
        _id: null,
        total: { $sum: '$totalAmount' }
      }
    }
  ]);
  
  // Get recent orders (last 5)
  const recentOrders = await Order.find(dateFilter)
    .sort({ createdAt: -1 })
    .limit(5)
    .populate('user', 'firstName lastName email')
    .select('orderNumber totalAmount orderStatus createdAt user');
  
  // Format the statistics
  const stats = {
    totalOrders,
    totalRevenue: totalRevenue[0]?.total || 0,
    ordersByStatus: ordersByStatus.reduce((acc, item) => {
      acc[item._id] = { count: item.count, totalAmount: item.totalAmount };
      return acc;
    }, {}),
    ordersByPaymentStatus: ordersByPaymentStatus.reduce((acc, item) => {
      acc[item._id] = { count: item.count, totalAmount: item.totalAmount };
      return acc;
    }, {}),
    recentOrders
  };
  
  res.status(200).json({
    success: true,
    data: stats,
  });
});

/**
 * Debug endpoint to check all order numbers
 */
const debugOrderNumbers = catchAsync(async (req, res) => {
  try {
    const orders = await Order.find({})
      .sort({ createdAt: -1 })
      .select('orderNumber createdAt totalAmount paymentStatus orderStatus')
      .limit(20);
    
    console.log('🔍 [DEBUG] Recent order numbers:');
    orders.forEach(order => {
      console.log(`- ${order.orderNumber} (${order.createdAt.toISOString()}) - ${order.totalAmount} - ${order.paymentStatus}`);
    });
    
      res.status(200).json({
    success: true,
    data: {
      totalOrders: orders.length,
      orders: orders.map(order => ({
        orderNumber: order.orderNumber,
        createdAt: order.createdAt,
        totalAmount: order.totalAmount,
        paymentStatus: order.paymentStatus,
        orderStatus: order.orderStatus
      })),
      // Check for potential duplicates or similar order numbers
      potentialIssues: orders.filter(order => 
        order.orderNumber.toLowerCase().includes('pointboard') && 
        order.orderNumber !== order.orderNumber.toUpperCase()
      ).map(order => ({
        orderNumber: order.orderNumber,
        issue: 'Mixed case detected'
      })),
      // Search for specific order number
      searchResults: {
        pointBoardA112094: await Order.findOne({ 
          orderNumber: { $regex: /pointboarda112094/i } 
        }).select('orderNumber createdAt totalAmount')
      }
    }
  });
  } catch (error) {
    console.error('[DEBUG ORDER NUMBERS] Error:', error);
    throw new APIError(500, 'Failed to fetch order numbers');
  }
});

/**
 * Generate order number for payment code
 */
const generateOrderNumberForPayment = catchAsync(async (req, res) => {
  try {
    const orderNumber = await generateOrderNumber();
    
    console.log('🎯 [GENERATE ORDER NUMBER] Generated:', orderNumber);
    
    res.status(200).json({
      success: true,
      data: {
        orderNumber: orderNumber,
        message: 'Order number generated successfully. Use this exact code for payment.'
      }
    });
  } catch (error) {
    console.error('[GENERATE ORDER NUMBER] Error:', error);
    throw new APIError(500, 'Failed to generate order number');
  }
});

module.exports = {
  createOrder,
  getOrderById,
  getUserOrders,
  updateOrderStatus,
  cancelOrder,
  getAllOrders,
  getOrderStats,
  generateOrderNumberForPayment,
  debugOrderNumbers,
  generateOrderNumber,
}; 