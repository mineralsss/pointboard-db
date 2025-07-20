const axios = require('axios');
const jwt = require('jsonwebtoken');

// Configuration
const USER_ID = '685986987b418c9427a24b94';
const BASE_URL = process.env.BASE_URL || 'https://pointboard-db-7cd97e9827ca.herokuapp.com';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Generate JWT token for the user
function generateToken(userId) {
  const payload = {
    sub: userId,
    userID: userId
  };
  
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "1d" });
}

async function checkAllUsers() {
  try {
    console.log('🔍 Checking All Users...\n');
    
    const token = generateToken(USER_ID);
    console.log(`✅ Generated token for user: ${USER_ID}\n`);
    
    // Test both endpoints
    console.log('📋 Testing /api/allusers (public)...');
    try {
      const publicResponse = await axios.get(`${BASE_URL}/api/allusers`);
      console.log(`✅ Public allusers response: ${publicResponse.status}`);
      console.log(`   Total users: ${publicResponse.data.users?.length || 0}`);
      
      const userInPublic = publicResponse.data.users?.find(u => u._id === USER_ID || u.id === USER_ID);
      if (userInPublic) {
        console.log('✅ User found in public endpoint:');
        console.log(`   ID: ${userInPublic._id || userInPublic.id}`);
        console.log(`   Name: ${userInPublic.firstName} ${userInPublic.lastName}`);
        console.log(`   Email: ${userInPublic.email}`);
        console.log(`   Role: ${userInPublic.role || 'N/A'}`);
      } else {
        console.log('❌ User NOT found in public endpoint');
      }
      
    } catch (error) {
      console.log('❌ Public allusers failed:');
      console.log(`   Status: ${error.response?.status || 'Unknown'}`);
      console.log(`   Error: ${error.response?.data?.message || error.message}`);
    }
    
    console.log('\n🔐 Testing /api/v1/allusers (admin)...');
    try {
      const adminResponse = await axios.get(`${BASE_URL}/api/v1/allusers`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache'
        }
      });
      
      console.log(`✅ Admin allusers response: ${adminResponse.status}`);
      console.log(`   Total users: ${adminResponse.data.users?.length || 0}`);
      
      const userInAdmin = adminResponse.data.users?.find(u => u._id === USER_ID || u.id === USER_ID);
      if (userInAdmin) {
        console.log('✅ User found in admin endpoint:');
        console.log(`   ID: ${userInAdmin._id || userInAdmin.id}`);
        console.log(`   Name: ${userInAdmin.firstName} ${userInAdmin.lastName}`);
        console.log(`   Email: ${userInAdmin.email}`);
        console.log(`   Role: ${userInAdmin.role || 'N/A'}`);
        console.log(`   Is Active: ${userInAdmin.isActive}`);
        console.log(`   Is Verified: ${userInAdmin.isVerified}`);
      } else {
        console.log('❌ User NOT found in admin endpoint');
        
        // Show first few users to debug
        console.log('\n🔍 First 5 users in admin response:');
        adminResponse.data.users?.slice(0, 5).forEach((user, index) => {
          console.log(`   ${index + 1}. ID: ${user._id || user.id || 'undefined'}`);
          console.log(`      Name: ${user.firstName} ${user.lastName}`);
          console.log(`      Email: ${user.email}`);
          console.log(`      Role: ${user.role || 'N/A'}`);
        });
      }
      
    } catch (error) {
      console.log('❌ Admin allusers failed:');
      console.log(`   Status: ${error.response?.status || 'Unknown'}`);
      console.log(`   Error: ${error.response?.data?.message || error.message}`);
    }
    
  } catch (error) {
    console.error('💥 Script failed:', error.message);
  }
}

console.log('🚀 Starting All Users Check...\n');
checkAllUsers(); 