const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order.controller');
const orderValidation = require('../validations/order.validation');
const validate = require('../middlewares/validate.middleware');
const auth = require('../middlewares/auth.middleware');

// Public routes (no authentication required)
router.post('/guest', 
  validate(orderValidation.createGuestOrder), 
  orderController.createGuestOrder
);
router.get('/ref/:orderRef', 
  validate(orderValidation.getOrderByRef), 
  orderController.getOrderByRef
);

// Authenticated user routes
router.use(auth); // Apply auth middleware to all routes below

router.post('/', 
  validate(orderValidation.createOrder), 
  orderController.createOrder
);
router.get('/my-orders', 
  validate(orderValidation.getUserOrders), 
  orderController.getUserOrders
);
router.get('/:orderId', 
  validate(orderValidation.getOrder), 
  orderController.getOrder
);
router.patch('/:orderId/status', 
  validate(orderValidation.updateOrderStatus), 
  orderController.updateOrderStatus
);
router.patch('/:orderId/cancel', 
  validate(orderValidation.cancelOrder), 
  orderController.cancelOrder
);

// Admin routes (you can add admin middleware here later)
// router.use(adminAuth); // Uncomment when you have admin middleware
router.get('/', 
  validate(orderValidation.getAllOrders), 
  orderController.getAllOrders
); // Get all orders (admin)
router.patch('/admin/:orderId', 
  validate(orderValidation.adminUpdateOrder), 
  orderController.adminUpdateOrder
); // Admin update order

module.exports = router; 