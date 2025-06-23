const Joi = require('joi');

const orderItemSchema = Joi.object({
  productId: Joi.string().required(),
  productName: Joi.string().required(),
  quantity: Joi.number().integer().min(1).required(),
  price: Joi.number().min(0).required()
});

const customerInfoSchema = Joi.object({
  firstName: Joi.string().required(),
  lastName: Joi.string().required(),
  email: Joi.string().email().required(),
  phone: Joi.string().required(),
  address: Joi.string().required()
});

const createOrder = {
  body: Joi.object().keys({
    customerInfo: customerInfoSchema,
    items: Joi.array().items(orderItemSchema).min(1).required(),
    currency: Joi.string().optional().default('VND'),
    paymentMethod: Joi.string().valid('bank_transfer', 'sepay', 'vnpay', 'cash').optional(),
    notes: Joi.string().optional(),
    metadata: Joi.object().optional()
  })
};

const createGuestOrder = {
  body: Joi.object().keys({
    customerInfo: customerInfoSchema.required(),
    items: Joi.array().items(orderItemSchema).min(1).required(),
    currency: Joi.string().optional().default('VND'),
    paymentMethod: Joi.string().valid('bank_transfer', 'sepay', 'vnpay', 'cash').optional(),
    notes: Joi.string().optional(),
    metadata: Joi.object().optional()
  })
};

const getOrder = {
  params: Joi.object().keys({
    orderId: Joi.string().required()
  })
};

const getOrderByRef = {
  params: Joi.object().keys({
    orderRef: Joi.string().required()
  })
};

const updateOrderStatus = {
  params: Joi.object().keys({
    orderId: Joi.string().required()
  }),
  body: Joi.object().keys({
    status: Joi.string().valid('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled').required()
  })
};

const cancelOrder = {
  params: Joi.object().keys({
    orderId: Joi.string().required()
  }),
  body: Joi.object().keys({
    reason: Joi.string().optional()
  })
};

const getUserOrders = {
  query: Joi.object().keys({
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    status: Joi.string().valid('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled').optional(),
    paymentStatus: Joi.string().valid('pending', 'paid', 'failed', 'refunded').optional(),
    sortBy: Joi.string().optional()
  })
};

const getAllOrders = {
  query: Joi.object().keys({
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    status: Joi.string().valid('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled').optional(),
    paymentStatus: Joi.string().valid('pending', 'paid', 'failed', 'refunded').optional(),
    sortBy: Joi.string().optional(),
    q: Joi.string().optional()
  })
};

const adminUpdateOrder = {
  params: Joi.object().keys({
    orderId: Joi.string().required()
  }),
  body: Joi.object().keys({
    status: Joi.string().valid('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled').optional(),
    paymentStatus: Joi.string().valid('pending', 'paid', 'failed', 'refunded').optional(),
    notes: Joi.string().optional(),
    shippingInfo: Joi.object().keys({
      method: Joi.string().optional(),
      trackingNumber: Joi.string().optional(),
      estimatedDelivery: Joi.date().optional(),
      actualDelivery: Joi.date().optional()
    }).optional()
  })
};

module.exports = {
  createOrder,
  createGuestOrder,
  getOrder,
  getOrderByRef,
  updateOrderStatus,
  cancelOrder,
  getUserOrders,
  getAllOrders,
  adminUpdateOrder
}; 