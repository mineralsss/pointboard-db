require("dotenv").config();
const mongoose = require("mongoose");

async function fixPhoneNumberIndex() {
  try {
    // Connect to MongoDB
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/chotuananhne",
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }
    );
    
    console.log("Connected to MongoDB");
    
    // Get the users collection
    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');
    
    // List all indexes to see current state
    console.log("Current indexes:");
    const indexes = await usersCollection.indexes();
    indexes.forEach(index => {
      console.log("Index:", JSON.stringify(index, null, 2));
    });
    
    // Check if there's a phoneNumber index that needs to be dropped
    const phoneIndexExists = indexes.some(index => 
      index.key && index.key.phoneNumber !== undefined
    );
    
    if (phoneIndexExists) {
      console.log("Dropping existing phoneNumber index...");
      try {
        await usersCollection.dropIndex({ phoneNumber: 1 });
        console.log("phoneNumber index dropped successfully");
      } catch (error) {
        console.log("Error dropping index (might not exist):", error.message);
      }
    }
    
    // Create new sparse unique index for phoneNumber
    console.log("Creating new sparse unique index for phoneNumber...");
    await usersCollection.createIndex(
      { phoneNumber: 1 }, 
      { 
        unique: true, 
        sparse: true,
        name: "phoneNumber_1_sparse"
      }
    );
    console.log("New sparse unique index created for phoneNumber");
    
    // List indexes again to confirm
    console.log("\nFinal indexes:");
    const finalIndexes = await usersCollection.indexes();
    finalIndexes.forEach(index => {
      if (index.key && index.key.phoneNumber !== undefined) {
        console.log("phoneNumber index:", JSON.stringify(index, null, 2));
      }
    });
    
    // Check for any users with duplicate or null phone numbers
    console.log("\nChecking for phone number duplicates...");
    const duplicatePhones = await usersCollection.aggregate([
      {
        $match: {
          phoneNumber: { $ne: null, $ne: "", $exists: true }
        }
      },
      {
        $group: {
          _id: "$phoneNumber",
          count: { $sum: 1 },
          users: { $push: { _id: "$_id", email: "$email" } }
        }
      },
      {
        $match: {
          count: { $gt: 1 }
        }
      }
    ]).toArray();
    
    if (duplicatePhones.length > 0) {
      console.log("Found duplicate phone numbers:");
      duplicatePhones.forEach(dup => {
        console.log(`Phone: ${dup._id}, Count: ${dup.count}`);
        dup.users.forEach(user => {
          console.log(`  User ID: ${user._id}, Email: ${user.email}`);
        });
      });
    } else {
      console.log("No duplicate phone numbers found");
    }
    
    // Check for users with null/empty phone numbers
    const nullPhoneCount = await usersCollection.countDocuments({
      $or: [
        { phoneNumber: null },
        { phoneNumber: "" },
        { phoneNumber: { $exists: false } }
      ]
    });
    console.log(`Users with null/empty phone numbers: ${nullPhoneCount}`);
    
  } catch (error) {
    console.error("Error fixing phone number index:", error);
  } finally {
    await mongoose.connection.close();
    console.log("Database connection closed");
  }
}

fixPhoneNumberIndex();
