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

// GET analytics data
router.get("/analytics", async (req, res) => {
  try {
    // Get basic stats
    const totalUsers = await User.countDocuments({});
    const totalOrders = await Order.countDocuments({});
    const totalReviews = await Review.countDocuments({});
    const totalTransactions = await Transaction.countDocuments({});
    
    // Get revenue from completed orders
    const revenueResult = await Order.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' } } }
    ]);
    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;
    
    // Get recent orders
    const recentOrders = await Order.find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('user', 'firstName lastName email');
    
    // Get user registration trend (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const newUsersLast7Days = await User.countDocuments({
      createdAt: { $gte: sevenDaysAgo }
    });
    
    const analytics = {
      totalUsers,
      totalOrders,
      totalReviews,
      totalTransactions,
      totalRevenue,
      newUsersLast7Days,
      recentOrders
    };
    
    res.status(200).json({ success: true, analytics });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

module.exports = router; 