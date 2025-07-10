const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2ODU5ODY5ODdiNDE4Yzk0MjdhMjRiOTQiLCJ1c2VySUQiOiI2ODU5ODY5ODdiNDE4Yzk0MjdhMjRiOTQiLCJlbWFpbCI6ImFjY3N1a2llbjJhQGdtYWlsLmNvbSIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc1MjE3MDEwMywiZXhwIjoxNzUyMTczNzAzfQ.EtPWFot7rKsbAYHRNfOCVown9BRjjS16w_GO3_Muh-A';

async function testOptionB() {
  try {
    console.log('🧪 [OPTION B TEST] Starting test...');
    
    // Test data
    const testData = {
      frontendOrderRef: `PointBoardA${Date.now().toString().slice(-6)}`,
      totalAmount: 50000,
      items: [
        {
          productId: 'test-product-1',
          productName: 'Test Product 1',
          quantity: 2,
          price: 25000
        }
      ],
      paymentMethod: 'bank_transfer',
      customerInfo: {
        fullName: 'Test User',
        phone: '+84123456789'
      },
      shippingAddress: {
        address: '123 Test Street',
        city: 'Ho Chi Minh',
        district: 'District 1'
      },
      notes: 'Test order for Option B synchronization'
    };
    
    console.log('📤 [OPTION B TEST] Sending request with data:', {
      frontendOrderRef: testData.frontendOrderRef,
      totalAmount: testData.totalAmount,
      itemsCount: testData.items.length
    });
    
    // Make the request
    const response = await axios.post(`${BASE_URL}/api/v1/orders/create-with-sync`, testData, {
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ [OPTION B TEST] Success!');
    console.log('Response:', {
      success: response.data.success,
      message: response.data.data.message,
      syncInfo: response.data.data.syncInfo,
      orderNumber: response.data.data.order.orderNumber,
      frontendOrderRef: response.data.data.order.frontendOrderRef,
      paymentCode: response.data.data.paymentCode
    });
    
    // Verify synchronization
    const isSynchronized = response.data.data.syncInfo.synchronized;
    const backendNumber = response.data.data.order.orderNumber;
    const frontendRef = response.data.data.order.frontendOrderRef;
    const paymentCode = response.data.data.paymentCode;
    
    console.log('🔍 [OPTION B TEST] Synchronization Check:');
    console.log(`  - Backend Order Number: ${backendNumber}`);
    console.log(`  - Frontend Order Ref: ${frontendRef}`);
    console.log(`  - Payment Code: ${paymentCode}`);
    console.log(`  - Synchronized: ${isSynchronized ? '✅ YES' : '❌ NO'}`);
    console.log(`  - Payment Code matches Backend Number: ${paymentCode === backendNumber ? '✅ YES' : '❌ NO'}`);
    
    return response.data;
    
  } catch (error) {
    console.error('❌ [OPTION B TEST] Error:', error.response?.data || error.message);
    throw error;
  }
}

// Run the test
testOptionB()
  .then(() => {
    console.log('🎉 [OPTION B TEST] Test completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 [OPTION B TEST] Test failed:', error.message);
    process.exit(1);
  }); 