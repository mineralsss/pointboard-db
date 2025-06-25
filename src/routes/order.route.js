const express = require("express");
const router = express.Router();
const orderController = require("../controllers/order.controller");
const auth = require("../middlewares/auth.middleware");
const validate = require("../middlewares/validate.middleware");
const orderValidation = require("../validations/order.validation");
const RoleConfig = require("../configs/role.config");

// Create a new order (authenticated users only)
router.post("/", auth(), validate(orderValidation.createOrder), orderController.createOrder);

// Get user's orders (authenticated users only)
router.get("/my-orders", auth(), orderController.getUserOrders);

// Get all orders (public)
router.get("/all", orderController.getAllOrders);

// Get order by ID (authenticated users only)
router.get("/:orderId", auth(), validate(orderValidation.getOrderById), orderController.getOrderById);

// Cancel order (authenticated users only)
router.post("/:orderId/cancel", auth(), validate(orderValidation.cancelOrder), orderController.cancelOrder);

// Update order status (admin only)
router.patch("/:orderId/status", auth(), validate(orderValidation.updateOrderStatus), orderController.updateOrderStatus);

// Test endpoint for debugging - direct order update
router.patch("/:orderId/test-status", async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, orderStatus } = req.body;
    
    console.log('TEST ENDPOINT - Input:', { orderId, status, orderStatus });
    
    const Order = require('../models/order.model');
    const order = await Order.findById(orderId);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    console.log('TEST ENDPOINT - Before update:', order.orderStatus);
    
    order.orderStatus = status || orderStatus || 'confirmed';
    
    console.log('TEST ENDPOINT - After assignment:', order.orderStatus);
    console.log('TEST ENDPOINT - Is modified:', order.isModified());
    
    const saved = await order.save();
    
    console.log('TEST ENDPOINT - After save:', saved.orderStatus);
    
    // Fetch again to verify
    const fresh = await Order.findById(orderId);
    console.log('TEST ENDPOINT - Fresh from DB:', fresh.orderStatus);
    
    res.json({ 
      success: true, 
      before: order.orderStatus,
      after: saved.orderStatus,
      fresh: fresh.orderStatus
    });
  } catch (error) {
    console.error('TEST ENDPOINT - Error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 