const orderService = require('../services/order.service');
const { OK, CREATED } = require('../configs/response.config');
const catchAsync = require('../utils/catchAsync');
const APIError = require('../utils/APIError');

class OrderController {
  // Create a new order
  createOrder = catchAsync(async (req, res) => {
    const userId = req.user?.id; // From auth middleware
    const orderData = req.body;

    console.log('Order creation request:', JSON.stringify(orderData, null, 2));

    // Validate required fields
    if (!orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Order items are required'
      });
    }

    // Validate customer info
    if (!orderData.customerInfo) {
      return res.status(400).json({
        success: false,
        message: 'Customer information is required'
      });
    }

    try {
      const result = await orderService.createOrder(orderData, userId);
      
      return CREATED(res, result.message, {
        success: true,
        order: result.order
      });
    } catch (error) {
      console.error('Error creating order:', error);
      
      if (error instanceof APIError) {
        return res.status(error.statusCode || 400).json({
          success: false,
          message: error.message
        });
      }
      
      return res.status(500).json({
        success: false,
        message: 'Failed to create order'
      });
    }
  });

  // Get order by ID
  getOrder = catchAsync(async (req, res) => {
    const { orderId } = req.params;
    const userId = req.user?.id; // From auth middleware

    try {
      const order = await orderService.getOrderById(orderId, userId);
      
      return OK(res, 'Order retrieved successfully', {
        success: true,
        order
      });
    } catch (error) {
      console.error('Error fetching order:', error);
      
      if (error instanceof APIError) {
        return res.status(error.statusCode || 404).json({
          success: false,
          message: error.message
        });
      }
      
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch order'
      });
    }
  });

  // Get order by reference
  getOrderByRef = catchAsync(async (req, res) => {
    const { orderRef } = req.params;
    const userId = req.user?.id; // From auth middleware

    try {
      const order = await orderService.getOrderByRef(orderRef, userId);
      
      return OK(res, 'Order retrieved successfully', {
        success: true,
        order
      });
    } catch (error) {
      console.error('Error fetching order:', error);
      
      if (error instanceof APIError) {
        return res.status(error.statusCode || 404).json({
          success: false,
          message: error.message
        });
      }
      
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch order'
      });
    }
  });

  // Get user's orders
  getUserOrders = catchAsync(async (req, res) => {
    const userId = req.user?.id; // From auth middleware
    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 10,
      status: req.query.status,
      paymentStatus: req.query.paymentStatus,
      sortBy: req.query.sortBy || '-createdAt'
    };

    try {
      const orders = await orderService.getUserOrders(userId, options);
      
      return OK(res, 'Orders retrieved successfully', {
        success: true,
        ...orders
      });
    } catch (error) {
      console.error('Error fetching user orders:', error);
      
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch orders'
      });
    }
  });

  // Update order status
  updateOrderStatus = catchAsync(async (req, res) => {
    const { orderId } = req.params;
    const { status } = req.body;
    const userId = req.user?.id; // From auth middleware

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    try {
      const order = await orderService.updateOrderStatus(orderId, status, userId);
      
      return OK(res, 'Order status updated successfully', {
        success: true,
        order
      });
    } catch (error) {
      console.error('Error updating order status:', error);
      
      if (error instanceof APIError) {
        return res.status(error.statusCode || 400).json({
          success: false,
          message: error.message
        });
      }
      
      return res.status(500).json({
        success: false,
        message: 'Failed to update order status'
      });
    }
  });

  // Cancel order
  cancelOrder = catchAsync(async (req, res) => {
    const { orderId } = req.params;
    const { reason } = req.body;
    const userId = req.user?.id; // From auth middleware

    try {
      const order = await orderService.cancelOrder(orderId, userId, reason);
      
      return OK(res, 'Order cancelled successfully', {
        success: true,
        order
      });
    } catch (error) {
      console.error('Error cancelling order:', error);
      
      if (error instanceof APIError) {
        return res.status(error.statusCode || 400).json({
          success: false,
          message: error.message
        });
      }
      
      return res.status(500).json({
        success: false,
        message: 'Failed to cancel order'
      });
    }
  });

  // Admin: Get all orders
  getAllOrders = catchAsync(async (req, res) => {
    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
      status: req.query.status,
      paymentStatus: req.query.paymentStatus,
      sortBy: req.query.sortBy || '-createdAt',
      q: req.query.q,
      allowSearchFields: ['orderRef', 'customerInfo.firstName', 'customerInfo.lastName', 'customerInfo.email']
    };

    try {
      const Order = require('../models/order.model');
      const orders = await Order.paginate({}, options);
      
      return OK(res, 'Orders retrieved successfully', {
        success: true,
        ...orders
      });
    } catch (error) {
      console.error('Error fetching all orders:', error);
      
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch orders'
      });
    }
  });

  // Admin: Update any order
  adminUpdateOrder = catchAsync(async (req, res) => {
    const { orderId } = req.params;
    const updates = req.body;

    try {
      const Order = require('../models/order.model');
      const order = await Order.findByIdAndUpdate(
        orderId,
        updates,
        { new: true, runValidators: true }
      ).populate('userId', 'firstName lastName email');

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }
      
      return OK(res, 'Order updated successfully', {
        success: true,
        order
      });
    } catch (error) {
      console.error('Error updating order:', error);
      
      return res.status(500).json({
        success: false,
        message: 'Failed to update order'
      });
    }
  });

  // Public: Create order without authentication (for guests)
  createGuestOrder = catchAsync(async (req, res) => {
    const orderData = req.body;

    console.log('Guest order creation request:', JSON.stringify(orderData, null, 2));

    // Validate required fields
    if (!orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Order items are required'
      });
    }

    // Validate customer info for guest orders
    const requiredFields = ['firstName', 'lastName', 'email', 'phone', 'address'];
    for (const field of requiredFields) {
      if (!orderData.customerInfo?.[field]) {
        return res.status(400).json({
          success: false,
          message: `Customer ${field} is required`
        });
      }
    }

    try {
      // For guest orders, create without userId
      const Order = require('../models/order.model');
      
      // Calculate total amount
      const totalAmount = orderData.items.reduce((total, item) => {
        return total + (item.price * item.quantity);
      }, 0);

      const order = new Order({
        customerInfo: orderData.customerInfo,
        items: orderData.items.map(item => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          price: item.price,
          totalPrice: item.price * item.quantity
        })),
        totalAmount,
        currency: orderData.currency || 'VND',
        paymentMethod: orderData.paymentMethod || 'bank_transfer',
        notes: orderData.notes,
        metadata: { ...orderData.metadata, isGuest: true }
      });

      await order.save();

      // Send order confirmation email
      try {
        await orderService.sendOrderConfirmationEmail(order);
      } catch (emailError) {
        console.error('Failed to send guest order confirmation email:', emailError);
        // Continue despite email failure
      }
      
      return CREATED(res, 'Order created successfully', {
        success: true,
        order
      });
    } catch (error) {
      console.error('Error creating guest order:', error);
      
      return res.status(500).json({
        success: false,
        message: 'Failed to create order'
      });
    }
  });
}

module.exports = new OrderController(); 