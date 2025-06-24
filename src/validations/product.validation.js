const Joi = require('joi');

const createProduct = {
  body: Joi.object().keys({
    name: Joi.string().required().min(3).max(200),
    description: Joi.string().required().min(10).max(5000),
    price: Joi.number().required().min(0),
    category: Joi.string().required().valid('course', 'ebook', 'software', 'service', 'other'),
    subcategory: Joi.string().allow('', null),
    images: Joi.array().items(Joi.string().uri()),
    thumbnail: Joi.string().uri(),
    stock: Joi.number().integer().min(-1).default(-1),
    isActive: Joi.boolean().default(true),
    features: Joi.array().items(Joi.string()),
    specifications: Joi.object().pattern(Joi.string(), Joi.string()),
    tags: Joi.array().items(Joi.string().lowercase().trim()),
  }),
};

const updateProduct = {
  params: Joi.object().keys({
    productId: Joi.string().required(),
  }),
  body: Joi.object().keys({
    name: Joi.string().min(3).max(200),
    description: Joi.string().min(10).max(5000),
    price: Joi.number().min(0),
    category: Joi.string().valid('course', 'ebook', 'software', 'service', 'other'),
    subcategory: Joi.string().allow('', null),
    images: Joi.array().items(Joi.string().uri()),
    thumbnail: Joi.string().uri(),
    stock: Joi.number().integer().min(-1),
    isActive: Joi.boolean(),
    features: Joi.array().items(Joi.string()),
    specifications: Joi.object().pattern(Joi.string(), Joi.string()),
    tags: Joi.array().items(Joi.string().lowercase().trim()),
  }).min(1),
};

const getProducts = {
  query: Joi.object().keys({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(100),
    sort: Joi.string(),
    category: Joi.string().valid('course', 'ebook', 'software', 'service', 'other'),
    minPrice: Joi.number().min(0),
    maxPrice: Joi.number().min(0),
    search: Joi.string(),
    isActive: Joi.boolean(),
  }),
};

const getProductById = {
  params: Joi.object().keys({
    productId: Joi.string().required(),
  }),
};

const deleteProduct = {
  params: Joi.object().keys({
    productId: Joi.string().required(),
  }),
};

const getProductsByCategory = {
  params: Joi.object().keys({
    category: Joi.string().required().valid('course', 'ebook', 'software', 'service', 'other'),
  }),
  query: Joi.object().keys({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(100),
    sort: Joi.string(),
  }),
};

const searchProducts = {
  query: Joi.object().keys({
    q: Joi.string().required().min(1),
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(100),
  }),
};

const updateProductStock = {
  params: Joi.object().keys({
    productId: Joi.string().required(),
  }),
  body: Joi.object().keys({
    quantity: Joi.number().integer().required(),
    operation: Joi.string().valid('set', 'increment', 'decrement').default('set'),
  }),
};

module.exports = {
  createProduct,
  updateProduct,
  getProducts,
  getProductById,
  deleteProduct,
  getProductsByCategory,
  searchProducts,
  updateProductStock,
}; 