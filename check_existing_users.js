require("dotenv").config();
const mongoose = require("mongoose");

async function checkExistingUsers() {
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
    
    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');
    
    // Check for the specific phone number from the logs
    const phoneNumber = "0989819929";
    const email = "hiennguyen191274tn@gmail.com";
    
    console.log(`Checking for users with phone number: ${phoneNumber}`);
    const usersByPhone = await usersCollection.find({ 
      phoneNumber: phoneNumber 
    }).toArray();
    
    console.log(`Found ${usersByPhone.length} users with this phone number:`);
    usersByPhone.forEach(user => {
      console.log(`- ID: ${user._id}, Email: ${user.email}, Phone: ${user.phoneNumber}, Created: ${user.createdAt}`);
    });
    
    console.log(`\nChecking for users with email: ${email}`);
    const usersByEmail = await usersCollection.find({ 
      email: email 
    }).toArray();
    
    console.log(`Found ${usersByEmail.length} users with this email:`);
    usersByEmail.forEach(user => {
      console.log(`- ID: ${user._id}, Email: ${user.email}, Phone: ${user.phoneNumber}, Created: ${user.createdAt}`);
    });
    
    // Check for any users with similar phone numbers (in case there are formatting issues)
    console.log(`\nChecking for users with similar phone numbers:`);
    const similarPhones = await usersCollection.find({
      phoneNumber: { $regex: "989819929", $options: "i" }
    }).toArray();
    
    console.log(`Found ${similarPhones.length} users with similar phone numbers:`);
    similarPhones.forEach(user => {
      console.log(`- ID: ${user._id}, Email: ${user.email}, Phone: ${user.phoneNumber}, Created: ${user.createdAt}`);
    });
    
    // Get total user count
    const totalUsers = await usersCollection.countDocuments({});
    console.log(`\nTotal users in database: ${totalUsers}`);
    
    // Show recent users
    console.log(`\nMost recent 5 users:`);
    const recentUsers = await usersCollection.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();
    
    recentUsers.forEach(user => {
      console.log(`- ID: ${user._id}, Email: ${user.email}, Phone: ${user.phoneNumber || 'N/A'}, Created: ${user.createdAt}`);
    });
    
  } catch (error) {
    console.error("Error checking existing users:", error);
  } finally {
    await mongoose.connection.close();
    console.log("\nDatabase connection closed");
  }
}

checkExistingUsers();
