// Test script to verify authentication improvements
// Run this with: node test-auth.js

const axios = require('axios');

// Configuration
const API_BASE_URL = process.env.API_URL || 'http://localhost:3000'; // Update with your API URL
const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'testpassword123';

async function testAuthenticationFlow() {
    console.log('🧪 Testing Authentication Flow Improvements\n');
    
    try {
        // Test 1: Registration with missing fields
        console.log('1️⃣ Testing registration with missing fields...');
        try {
            await axios.post(`${API_BASE_URL}/auth/register`, {
                firstName: 'Test',
                // lastName missing
                email: TEST_EMAIL,
                password: TEST_PASSWORD
            });
            console.log('❌ Should have failed with validation error');
        } catch (error) {
            if (error.response?.status === 400 && error.response?.data?.errorType === 'validation_error') {
                console.log('✅ Correctly rejected missing fields');
                console.log('   Message:', error.response.data.message);
            } else {
                console.log('❌ Unexpected error:', error.response?.data || error.message);
            }
        }
        
        // Test 2: Valid registration
        console.log('\n2️⃣ Testing valid registration...');
        try {
            const registerResponse = await axios.post(`${API_BASE_URL}/auth/register`, {
                firstName: 'Test',
                lastName: 'User',
                email: TEST_EMAIL,
                password: TEST_PASSWORD,
                phone: '1234567890'
            });
            
            if (registerResponse.status === 201 && registerResponse.data.success) {
                console.log('✅ Registration successful');
                console.log('   Message:', registerResponse.data.message);
            } else {
                console.log('❌ Unexpected registration response:', registerResponse.data);
            }
        } catch (error) {
            if (error.response?.data?.errorType === 'duplicate_email') {
                console.log('ℹ️  User already exists (expected if running multiple times)');
            } else {
                console.log('❌ Registration failed:', error.response?.data || error.message);
            }
        }
        
        // Test 3: Login with unverified account
        console.log('\n3️⃣ Testing login with unverified account...');
        try {
            await axios.post(`${API_BASE_URL}/auth/login`, {
                email: TEST_EMAIL,
                password: TEST_PASSWORD
            });
            console.log('❌ Should have failed with verification error');
        } catch (error) {
            if (error.response?.status === 400 && error.response?.data?.errorType === 'email_not_verified') {
                console.log('✅ Correctly rejected unverified user');
                console.log('   Message:', error.response.data.message);
                console.log('   Can resend verification:', error.response.data.canResendVerification);
            } else {
                console.log('❌ Unexpected error:', error.response?.data || error.message);
            }
        }
        
        // Test 4: Duplicate email registration
        console.log('\n4️⃣ Testing duplicate email registration...');
        try {
            await axios.post(`${API_BASE_URL}/auth/register`, {
                firstName: 'Another',
                lastName: 'User',
                email: TEST_EMAIL,
                password: 'anotherpassword123'
            });
            console.log('❌ Should have failed with duplicate email error');
        } catch (error) {
            if (error.response?.status === 400 && error.response?.data?.errorType === 'duplicate_email') {
                console.log('✅ Correctly rejected duplicate email');
                console.log('   Message:', error.response.data.message);
            } else {
                console.log('❌ Unexpected error:', error.response?.data || error.message);
            }
        }
        
        // Test 5: Invalid login credentials
        console.log('\n5️⃣ Testing invalid login credentials...');
        try {
            await axios.post(`${API_BASE_URL}/auth/login`, {
                email: TEST_EMAIL,
                password: 'wrongpassword'
            });
            console.log('❌ Should have failed with invalid credentials');
        } catch (error) {
            if (error.response?.status === 400) {
                console.log('✅ Correctly rejected invalid credentials');
                console.log('   Message:', error.response.data.message);
            } else {
                console.log('❌ Unexpected error:', error.response?.data || error.message);
            }
        }
        
        console.log('\n🎉 Authentication flow test completed!');
        console.log('\nNext steps:');
        console.log('1. Verify email for the test user to test successful login');
        console.log('2. Test the password reset flow');
        console.log('3. Test the email verification resend functionality');
        
    } catch (error) {
        console.error('💥 Test failed with unexpected error:', error.message);
    }
}

// Run the test
testAuthenticationFlow();
