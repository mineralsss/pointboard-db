require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./src/models/user.model");

async function checkUser(userId) {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/chotuananhne", {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log("✅ Connected to MongoDB");
    
    // Find the user by ID
    const user = await User.findById(userId);
    
    if (!user) {
      console.log(`❌ User with ID ${userId} not found`);
      return;
    }
    
    console.log("✅ User found:");
    console.log("📋 User Details:");
    console.log(`   ID: ${user._id}`);
    console.log(`   First Name: ${user.firstName}`);
    console.log(`   Last Name: ${user.lastName}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Phone: ${user.phone}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Is Active: ${user.isActive}`);
    console.log(`   Is Verified: ${user.isVerified}`);
    console.log(`   Created At: ${user.createdAt}`);
    console.log(`   Updated At: ${user.updatedAt}`);
    
    if (user.balance !== undefined) {
      console.log(`   Balance: ${user.balance}`);
    }
    
    if (user.avatar) {
      console.log(`   Avatar: ${user.avatar}`);
    }
    
    // Check if user has any orders
    const Order = require("./src/models/order.model");
    const userOrders = await Order.find({ user: userId });
    console.log(`   Orders: ${userOrders.length} orders found`);
    
    // Check if user has any reviews
    const Review = require("./src/models/review.model");
    const userReviews = await Review.find({ user: userId });
    console.log(`   Reviews: ${userReviews.length} reviews found`);
    
    console.log("\n📊 User Statistics:");
    console.log(`   Total Orders: ${userOrders.length}`);
    console.log(`   Total Reviews: ${userReviews.length}`);
    
    if (userOrders.length > 0) {
      const totalSpent = userOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
      console.log(`   Total Spent: $${totalSpent.toFixed(2)}`);
      
      const completedOrders = userOrders.filter(order => order.status === 'completed');
      console.log(`   Completed Orders: ${completedOrders.length}`);
    }
    
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  }
}

// Check the specific user
const userId = "685986987b418c9427a24b94";
console.log(`🔍 Checking user with ID: ${userId}`);
checkUser(userId); 