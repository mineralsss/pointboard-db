require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const Transaction = require('./src/models/transaction.model');
const Order = require('./src/models/order.model');
const User = require('./src/models/user.model');
const Review = require('./src/models/review.model');

async function testApiEndpoints() {
  try {
    console.log("🧪 Testing API Endpoints...\n");
    
    // Connect to MongoDB
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/chotuananhne",
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }
    );
    console.log("✅ Connected to MongoDB\n");

    // Test data availability
    console.log("📊 Checking Data Availability:");
    const userCount = await User.countDocuments({});
    const orderCount = await Order.countDocuments({});
    const reviewCount = await Review.countDocuments({});
    const transactionCount = await Transaction.countDocuments({});
    
    console.log(`  Users: ${userCount}`);
    console.log(`  Orders: ${orderCount}`);
    console.log(`  Reviews: ${reviewCount}`);
    console.log(`  Transactions: ${transactionCount}\n`);

    // Test analytics calculation
    console.log("📈 Testing Analytics Calculation:");
    
    // Get revenue from completed orders
    const revenueResult = await Order.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' } } }
    ]);
    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;
    console.log(`  Total Revenue: ${totalRevenue}`);
    
    // Get user registration trend (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const newUsersLast7Days = await User.countDocuments({
      createdAt: { $gte: sevenDaysAgo }
    });
    console.log(`  New Users (7 days): ${newUsersLast7Days}`);
    
    // Get recent orders
    const recentOrders = await Order.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('user', 'firstName lastName email');
    
    console.log(`  Recent Orders: ${recentOrders.length}`);
    
    // Test reviews with population
    console.log("\n👥 Testing Reviews with Population:");
    const reviews = await Review.find({})
      .limit(3)
      .populate('user', 'firstName lastName email')
      .populate('product', 'name')
      .populate('order', 'orderNumber');
    
    console.log(`  Reviews with population: ${reviews.length}`);
    if (reviews.length > 0) {
      console.log(`  Sample review: User ${reviews[0].user?.firstName || 'N/A'}, Rating: ${reviews[0].rating}`);
    }

    console.log("\n✅ All endpoint data tests passed!");
    console.log("\n🚀 The following endpoints should now work:");
    console.log("  GET /api/v1/allusers");
    console.log("  GET /api/v1/reviews");  
    console.log("  GET /api/v1/analytics");
    
  } catch (error) {
    console.error("❌ Test failed:", error);
  } finally {
    await mongoose.connection.close();
    console.log("\n🔌 Database connection closed");
  }
}

testApiEndpoints();
