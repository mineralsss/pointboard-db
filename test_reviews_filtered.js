const axios = require('axios');
const jwt = require('jsonwebtoken');

// Configuration
const USER_ID = '685986987b418c9427a24b94';
const BASE_URL = process.env.BASE_URL || 'https://pointboard-db-7cd97e9827ca.herokuapp.com';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const PRODUCT_ID = '6864ef773582a8e38dccbaf3';

// Generate JWT token for the user
function generateToken(userId) {
  const payload = {
    sub: userId,
    userID: userId
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "1d" });
}

async function testReviewsEndpoints() {
  try {
    console.log('🔍 Testing Reviews Endpoints with Product Filtering...\n');
    
    const token = generateToken(USER_ID);
    console.log(`✅ Generated token for user: ${USER_ID}\n`);
    
    // Test public reviews with product filter
    console.log('📋 Testing /api/reviews?product=' + PRODUCT_ID + ' (public)...');
    try {
      const publicResponse = await axios.get(`${BASE_URL}/api/reviews?product=${PRODUCT_ID}`);
      console.log('✅ Public reviews response:');
      console.log(`   Status: ${publicResponse.status}`);
      console.log(`   Total reviews for product: ${publicResponse.data.reviews?.length || 0}`);
      console.log(`   Success: ${publicResponse.data.success}\n`);
    } catch (error) {
      console.log('❌ Public reviews failed:');
      console.log(`   Status: ${error.response?.status || 'Unknown'}`);
      console.log(`   Error: ${error.response?.data?.message || error.message}\n`);
    }
    
    // Test admin reviews with product filter
    console.log('🔐 Testing /api/v1/reviews?product=' + PRODUCT_ID + ' (admin)...');
    try {
      const adminResponse = await axios.get(`${BASE_URL}/api/v1/reviews?product=${PRODUCT_ID}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache'
        }
      });
      console.log('✅ Admin reviews response:');
      console.log(`   Status: ${adminResponse.status}`);
      console.log(`   Total reviews for product: ${adminResponse.data.reviews?.length || 0}`);
      console.log(`   Success: ${adminResponse.data.success}\n`);
    } catch (error) {
      console.log('❌ Admin reviews failed:');
      console.log(`   Status: ${error.response?.status || 'Unknown'}`);
      console.log(`   Error: ${error.response?.data?.message || error.message}\n`);
    }
    
    // Test POST endpoint for creating a review
    console.log('📝 Testing POST /api/v1/reviews (create review)...');
    try {
      const reviewData = {
        productId: PRODUCT_ID,
        rating: 5,
        comment: 'Test review from script - ' + new Date().toISOString(),
        images: []
      };
      
      const postResponse = await axios.post(`${BASE_URL}/api/v1/reviews`, reviewData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Create review response:');
      console.log(`   Status: ${postResponse.status}`);
      console.log(`   Success: ${postResponse.data.success}`);
      console.log(`   Message: ${postResponse.data.message}`);
      console.log(`   Review ID: ${postResponse.data.review?._id}\n`);
      
    } catch (error) {
      console.log('❌ Create review failed:');
      console.log(`   Status: ${error.response?.status || 'Unknown'}`);
      console.log(`   Error: ${error.response?.data?.message || error.message}\n`);
    }
    
  } catch (error) {
    console.error('💥 Script failed:', error.message);
  }
}

console.log('🚀 Starting Reviews Test Script...\n');
testReviewsEndpoints(); 