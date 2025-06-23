// Test script to verify authentication improvements
// Run this with: node test-auth.js

const axios = require('axios');

// Configuration
const API_BASE_URL = process.env.API_URL || 'https://pointboard-db-7cd97e9827ca.herokuapp.com/api/v1'; // Update with your API URL
const TEST_EMAIL = 'test@example.com';
const TEST_EMAIL_2 = 'test2@example.com';
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
        
        // Test 2: Valid registration WITHOUT phone number
        console.log('\n2️⃣ Testing valid registration WITHOUT phone number...');
        try {
            const registerResponse = await axios.post(`${API_BASE_URL}/auth/register`, {
                firstName: 'Test',
                lastName: 'User',
                email: TEST_EMAIL,
                password: TEST_PASSWORD
                // No phone number provided
            });
            
            if (registerResponse.status === 201 && registerResponse.data.success) {
                console.log('✅ Registration without phone successful');
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
        
        // Test 3: Another valid registration WITHOUT phone number (to test the phone duplicate bug)
        console.log('\n3️⃣ Testing another registration WITHOUT phone number...');
        try {
            const registerResponse = await axios.post(`${API_BASE_URL}/auth/register`, {
                firstName: 'Test2',
                lastName: 'User2',
                email: TEST_EMAIL_2,
                password: TEST_PASSWORD
                // No phone number provided - this should NOT fail with phone duplicate
            });
            
            if (registerResponse.status === 201 && registerResponse.data.success) {
                console.log('✅ Second registration without phone successful');
                console.log('   Message:', registerResponse.data.message);
            } else {
                console.log('❌ Unexpected registration response:', registerResponse.data);
            }
        } catch (error) {
            if (error.response?.data?.errorType === 'duplicate_email') {
                console.log('ℹ️  User already exists (expected if running multiple times)');
            } else if (error.response?.data?.errorType === 'duplicate_phone') {
                console.log('❌ BUG DETECTED: Phone duplicate error when no phone was provided!');
                console.log('   This should NOT happen after the fix');
                console.log('   Error:', error.response.data);
            } else {
                console.log('❌ Registration failed:', error.response?.data || error.message);
            }
        }
        
        // Test 4: Registration WITH phone number
        console.log('\n4️⃣ Testing registration WITH phone number...');
        try {
            const registerResponse = await axios.post(`${API_BASE_URL}/auth/register`, {
                firstName: 'Test3',
                lastName: 'User3',
                email: 'test3@example.com',
                password: TEST_PASSWORD,
                phone: '1234567890'
            });
            
            if (registerResponse.status === 201 && registerResponse.data.success) {
                console.log('✅ Registration with phone successful');
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
        
        // Test 5: Login with unverified account
        console.log('\n5️⃣ Testing login with unverified account...');
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
        
        // Test 6: Duplicate phone number
        console.log('\n6️⃣ Testing duplicate phone number registration...');
        try {
            await axios.post(`${API_BASE_URL}/auth/register`, {
                firstName: 'Test4',
                lastName: 'User4',
                email: 'test4@example.com',
                password: TEST_PASSWORD,
                phone: '1234567890' // Same phone as test 4
            });
            console.log('❌ Should have failed with duplicate phone error');
        } catch (error) {
            if (error.response?.status === 400 && error.response?.data?.errorType === 'duplicate_phone') {
                console.log('✅ Correctly rejected duplicate phone');
                console.log('   Message:', error.response.data.message);
            } else if (error.response?.data?.errorType === 'duplicate_email') {
                console.log('ℹ️  Email duplicate (expected if running multiple times)');
            } else {
                console.log('❌ Unexpected error:', error.response?.data || error.message);
            }
        }
        
        console.log('\n🎉 Authentication flow test completed!');
        console.log('\nNext steps:');
        console.log('1. Run the database migration: node fix-phone-index.js');
        console.log('2. Verify email for test users to test successful login');
        console.log('3. Test the password reset flow');
        console.log('4. Test the email verification resend functionality');
        
    } catch (error) {
        console.error('💥 Test failed with unexpected error:', error.message);
    }
}

// Run the test
testAuthenticationFlow();
