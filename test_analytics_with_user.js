const jwt = require('jsonwebtoken');
const axios = require('axios');

// Configuration
const USER_ID = '685986987b418c9427a24b94';
const BASE_URL = process.env.BASE_URL || 'https://pointboard-db-7cd97e9827ca.herokuapp.com';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Generate JWT token for the user (matching the app's format)
function generateToken(userId) {
  const payload = {
    sub: userId,  // This is what the auth middleware expects
    userID: userId
  };
  
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "1d" });
}

// Test analytics endpoints
async function testAnalytics() {
  try {
    console.log('🔍 Testing Analytics Endpoints...\n');
    
    // Generate token
    const token = generateToken(USER_ID);
    console.log(`✅ Generated token for user: ${USER_ID}`);
    console.log(`🔑 Token: ${token.substring(0, 50)}...\n`);
    
    // Test public analytics endpoint (no auth required)
    console.log('📊 Testing PUBLIC analytics endpoint (/api/analytics)...');
    try {
      const publicResponse = await axios.get(`${BASE_URL}/api/analytics`, {
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      console.log('✅ Public analytics response:');
      console.log(JSON.stringify(publicResponse.data, null, 2));
    } catch (error) {
      console.log('❌ Public analytics failed:');
      console.log(`   Status: ${error.response?.status || 'Unknown'}`);
      console.log(`   Error: ${error.response?.data?.message || error.message}\n`);
    }
    
    // Test admin analytics endpoint (requires auth)
    console.log('🔐 Testing ADMIN analytics endpoint (/api/v1/analytics)...');
    try {
      const adminResponse = await axios.get(`${BASE_URL}/api/v1/analytics`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache'
        }
      });
      
      console.log('✅ Admin analytics response:');
      console.log(JSON.stringify(adminResponse.data, null, 2));
    } catch (error) {
      console.log('❌ Admin analytics failed:');
      console.log(`   Status: ${error.response?.status || 'Unknown'}`);
      console.log(`   Error: ${error.response?.data?.message || error.message}\n`);
    }
    
    // Test user details
    console.log('👤 Testing user details...');
    try {
      const userResponse = await axios.get(`${BASE_URL}/api/v1/allusers`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache'
        }
      });
      
      const user = userResponse.data.users?.find(u => u._id === USER_ID);
      if (user) {
        console.log('✅ User found:');
        console.log(`   Name: ${user.firstName} ${user.lastName}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Role: ${user.role || 'N/A'}`);
        console.log(`   Is Active: ${user.isActive}`);
        console.log(`   Is Verified: ${user.isVerified}`);
        console.log(`   Created: ${user.createdAt}`);
      } else {
        console.log('❌ User not found in the list');
      }
      
    } catch (error) {
      console.log('❌ User details failed:');
      console.log(`   Status: ${error.response?.status || 'Unknown'}`);
      console.log(`   Error: ${error.response?.data?.message || error.message}`);
    }
    
  } catch (error) {
    console.error('💥 Script failed:', error.message);
  }
}

// Run the test
console.log('🚀 Starting Analytics Test Script...\n');
testAnalytics(); 