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

async function fetchReviews() {
  try {
    console.log('📋 Fetching all reviews (public endpoint)...');
    try {
      const publicResponse = await axios.get(`${BASE_URL}/api/reviews`);
      console.log('✅ Public reviews response:');
      console.log(JSON.stringify(publicResponse.data, null, 2));
    } catch (error) {
      console.log('❌ Public reviews failed:');
      console.log(`   Status: ${error.response?.status || 'Unknown'}`);
      console.log(`   Error: ${error.response?.data?.message || error.message}`);
    }

    console.log('\n🔐 Fetching all reviews (admin endpoint)...');
    const token = generateToken(USER_ID);
    try {
      const adminResponse = await axios.get(`${BASE_URL}/api/v1/reviews`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache'
        }
      });
      console.log('✅ Admin reviews response:');
      console.log(JSON.stringify(adminResponse.data, null, 2));
    } catch (error) {
      console.log('❌ Admin reviews failed:');
      console.log(`   Status: ${error.response?.status || 'Unknown'}`);
      console.log(`   Error: ${error.response?.data?.message || error.message}`);
    }
  } catch (error) {
    console.error('💥 Script failed:', error.message);
  }
}

console.log('🚀 Starting Reviews Fetch Script...\n');
fetchReviews(); 