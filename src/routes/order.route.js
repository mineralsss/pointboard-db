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

// Get order by ID (authenticated users only)
router.get("/:orderId", auth(), validate(orderValidation.getOrderById), orderController.getOrderById);

// Cancel order (authenticated users only)
router.post("/:orderId/cancel", auth(), validate(orderValidation.cancelOrder), orderController.cancelOrder);

// Admin routes
// Get all orders (admin only)
router.get("/", auth(RoleConfig.ADMIN), orderController.getAllOrders);

// Update order status (admin only)
router.patch("/:orderId/status", auth(RoleConfig.ADMIN), validate(orderValidation.updateOrderStatus), orderController.updateOrderStatus);

module.exports = router; 