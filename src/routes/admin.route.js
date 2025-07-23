const express = require("express");
const router = express.Router();
const User = require("../models/user.model");
const Order = require("../models/order.model");
const Review = require("../models/review.model");
const Transaction = require("../models/transaction.model");
const auth = require("../middlewares/auth.middleware");
const roleConfig = require("../configs/role.config");

// Apply admin authentication middleware to all routes
router.use(auth(roleConfig.ADMIN));

// GET all users
router.get("/allusers", async (req, res) => {
  try {
    const users = await User.find({});
    res.status(200).json({ success: true, users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// GET all reviews
router.get("/reviews", async (req, res) => {
  try {
    const reviews = await Review.find({})
      .populate('user', 'firstName lastName email')
      .populate('product', 'name')
      .populate('order', 'orderNumber');
    res.status(200).json({ success: true, reviews });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

module.exports = router; 