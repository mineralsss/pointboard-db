const express = require("express");
const router = express.Router();
const User = require("../models/user.model");
const Order = require("../models/order.model");
const Review = require("../models/review.model");
const Transaction = require("../models/transaction.model");

// GET analytics data (public)
router.get("/", async (req, res) => {
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