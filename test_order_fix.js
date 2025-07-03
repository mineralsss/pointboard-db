// Test script to verify order number consistency
const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testOrderNumberConsistency() {
  console.log('🧪 Testing Order Number Consistency...\n');
  
  try {
    // Test 1: Create order using create-from-ref endpoint
    console.log('📦 Test 1: Creating order via create-from-ref endpoint');
    const createFromRefResponse = await axios.post(`${BASE_URL}/api/orders/create-from-ref`, {
      orderRef: 'POINTBOARDA123456',
      totalAmount: 100000,
      items: [{
        productName: 'Test Product',
        quantity: 1,
        price: 100000
      }]
    });
    
    console.log('✅ create-from-ref Response:');
    console.log('  - Order Number:', createFromRefResponse.data.data.order.orderNumber);
    console.log('  - Payment Code:', createFromRefResponse.data.data.paymentCode);
    console.log('  - Match:', createFromRefResponse.data.data.order.orderNumber === createFromRefResponse.data.data.paymentCode);
    
    const orderNumber1 = createFromRefResponse.data.data.order.orderNumber;
    const paymentCode1 = createFromRefResponse.data.data.paymentCode;
    
    // Test 2: Create order using main order endpoint
    console.log('\n📦 Test 2: Creating order via main order endpoint');
    const createOrderResponse = await axios.post(`${BASE_URL}/api/orders`, {
      totalAmount: 200000,
      items: [{
        productName: 'Test Product 2',
        quantity: 1,
        price: 200000
      }]
    });
    
    console.log('✅ Main Order Response:');
    console.log('  - Order Number:', createOrderResponse.data.data.order.orderNumber);
    console.log('  - Payment Code:', createOrderResponse.data.data.paymentCode);
    console.log('  - Match:', createOrderResponse.data.data.order.orderNumber === createOrderResponse.data.data.paymentCode);
    
    const orderNumber2 = createOrderResponse.data.data.order.orderNumber;
    const paymentCode2 = createOrderResponse.data.data.paymentCode;
    
    // Test 3: Check debug endpoint
    console.log('\n🔍 Test 3: Checking debug endpoint');
    const debugResponse = await axios.get(`${BASE_URL}/api/debug/recent-orders`);
    
    console.log('✅ Debug Response:');
    console.log('  - Recent Orders:', debugResponse.data.orders.length);
    debugResponse.data.orders.forEach((order, index) => {
      console.log(`  ${index + 1}. ${order.orderNumber} - ${order.totalAmount} ₫`);
    });
    
    // Test 4: Verify consistency
    console.log('\n🎯 Test 4: Consistency Check');
    console.log('  - create-from-ref order number format:', /^POINTBOARD[A-Z][0-9]{6}$/.test(orderNumber1));
    console.log('  - main order order number format:', /^POINTBOARD[A-Z][0-9]{6}$/.test(orderNumber2));
    console.log('  - Both use same format:', /^POINTBOARD[A-Z][0-9]{6}$/.test(orderNumber1) && /^POINTBOARD[A-Z][0-9]{6}$/.test(orderNumber2));
    console.log('  - create-from-ref consistency:', orderNumber1 === paymentCode1);
    console.log('  - main order consistency:', orderNumber2 === paymentCode2);
    
    // Test 5: Check for mixed case issues
    console.log('\n🔍 Test 5: Mixed Case Check');
    const mixedCaseIssues = debugResponse.data.orders.filter(order => 
      order.orderNumber.toLowerCase().includes('pointboard') && 
      order.orderNumber !== order.orderNumber.toUpperCase()
    );
    
    if (mixedCaseIssues.length > 0) {
      console.log('  ⚠️ Mixed case issues found:');
      mixedCaseIssues.forEach(order => {
        console.log(`    - ${order.orderNumber} (should be: ${order.orderNumber.toUpperCase()})`);
      });
    } else {
      console.log('  ✅ No mixed case issues found');
    }
    
    console.log('\n🎉 Test Complete!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the test
testOrderNumberConsistency(); 