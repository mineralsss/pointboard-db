const Joi = require('joi');

const createOrder = {
  body: Joi.object().keys({
    items: Joi.array().items(
      Joi.object().keys({
        productId: Joi.string().allow('', null).optional(), // Made optional
        productName: Joi.string().required(),
        quantity: Joi.number().integer().min(1).required(),
        price: Joi.number().min(0).required(),
        // Allow additional fields that frontend might send
        id: Joi.string().optional(),
        name: Joi.string().optional(),
        amount: Joi.number().optional(),
      }).unknown(true) // Allow unknown fields
    ).min(1).required(),
    totalAmount: Joi.number().min(0).required(),
    paymentMethod: Joi.string().valid('bank_transfer', 'cash', 'card').default('bank_transfer'),
    shippingAddress: Joi.object().keys({
      fullName: Joi.string().required(),
      phone: Joi.string().required(),
      address: Joi.string().required(),
      city: Joi.string().required(),
      district: Joi.string().required(),
      ward: Joi.string().allow('', null).optional(),
      notes: Joi.string().allow('', null).optional(),
    }).optional(), // Made optional in case frontend doesn't send it
    notes: Joi.string().allow('', null).optional(),
    transactionReference: Joi.string().optional(), // New field for existing transaction reference
  }).unknown(true), // Allow unknown fields at the root level
};

const updateOrderStatus = {
  params: Joi.object().keys({
    orderId: Joi.string().required(),
  }),
  body: Joi.object().keys({
    orderStatus: Joi.string().valid('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'),
    paymentStatus: Joi.string().valid('pending', 'processing', 'completed', 'failed', 'refunded'),
    status: Joi.string().valid('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'), // Add support for 'status' field
  }).min(1),
};

const getOrderById = {
  params: Joi.object().keys({
    orderId: Joi.string().required(),
  }),
};

const cancelOrder = {
  params: Joi.object().keys({
    orderId: Joi.string().required(),
  }),
};

module.exports = {
  createOrder,
  updateOrderStatus,
  getOrderById,
  cancelOrder,
}; 