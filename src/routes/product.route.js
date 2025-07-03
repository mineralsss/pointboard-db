const express = require("express");
const router = express.Router();
const productController = require("../controllers/product.controller");
const auth = require("../middlewares/auth.middleware");
const validate = require("../middlewares/validate.middleware");
const productValidation = require("../validations/product.validation");
const RoleConfig = require("../configs/role.config");

// Public routes (no authentication required)
// Get all products
router.get("/", validate(productValidation.getProducts), productController.getProducts);

// Get featured products
router.get("/featured", productController.getFeaturedProducts);

// Search products
router.get("/search", validate(productValidation.searchProducts), productController.searchProducts);

// Get products by category
router.get("/category/:category", validate(productValidation.getProductsByCategory), productController.getProductsByCategory);

// Get product by ID
router.get("/:productId", validate(productValidation.getProductById), productController.getProductById);

// Protected routes (authentication required)
// Create product (admin and instructor only)
router.post(
  "/",
  auth(RoleConfig.ADMIN, RoleConfig.INSTRUCTOR),
  validate(productValidation.createProduct),
  productController.createProduct
);

// Update product (admin and instructor only)
router.put(
  "/:productId",
  auth(RoleConfig.ADMIN, RoleConfig.INSTRUCTOR),
  validate(productValidation.updateProduct),
  productController.updateProduct
);

// Delete product (admin only)
router.delete(
  "/:productId",
  auth(RoleConfig.ADMIN),
  validate(productValidation.deleteProduct),
  productController.deleteProduct
);

// Update product stock (admin and instructor only)
router.patch(
  "/:productId/stock",
  auth(RoleConfig.ADMIN, RoleConfig.INSTRUCTOR),
  validate(productValidation.updateProductStock),
  productController.updateProductStock
);

module.exports = router; 