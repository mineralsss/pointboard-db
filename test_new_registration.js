require("dotenv").config();
const mongoose = require("mongoose");
const User = require('./src/models/user.model');

async function testNewRegistration() {
  try {
    // Connect to MongoDB
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://0.0.0.0:27017/chotuananhne",
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }
    );
    
    console.log("Connected to MongoDB");
    
    // Test data with different phone number
    const testUser = {
      firstName: "Nguyen Test",
      lastName: "Thi Hien Test",
      email: "test.unique.email@gmail.com",
      password: "Thung01072008@",
      phoneNumber: "0123456789", // Different phone number
      address: "Test Address",
      dob: new Date("1974-12-19T00:00:00.000Z"),
      role: "student"
    };
    
    console.log("Testing user creation with data:", testUser);
    
    // Try to create the user
    const user = await User.create(testUser);
    console.log("Test user created successfully:", {
      id: user._id,
      email: user.email,
      phoneNumber: user.phoneNumber
    });
    
    // Clean up - delete the test user
    await User.findByIdAndDelete(user._id);
    console.log("Test user deleted");
    
    console.log("✅ Registration with unique phone number works correctly");
    
  } catch (error) {
    console.error("❌ Error during test:", {
      message: error.message,
      code: error.code,
      name: error.name,
      keyPattern: error.keyPattern,
      keyValue: error.keyValue
    });
  } finally {
    await mongoose.connection.close();
    console.log("Database connection closed");
  }
}

testNewRegistration();
