# Order Number System Documentation

## Overview
The order number system has been updated to ensure complete consistency between the order numbers shown on payment codes and the order numbers stored in the database. This eliminates any mismatches that could occur during the order creation process.

## Order Number Format
All order numbers follow the format: `POINTBOARD[A-Z][0-9]{6}`

**Examples:**
- `POINTBOARDA123456`
- `POINTBOARDB789012`
- `POINTBOARDZ999999`

## API Endpoints

### 1. Generate Order Number for Payment
**GET** `/api/orders/generate-order-number`

Generates a unique order number that can be used for payment codes.

**Authentication:** Required (authenticated users only)

**Response:**
```json
{
  "success": true,
  "data": {
    "orderNumber": "POINTBOARDA123456",
    "message": "Order number generated successfully. Use this exact code for payment."
  }
}
```

### 2. Create Order with Generated Order Number
**POST** `/api/orders/`

Creates a new order with an automatically generated unique order number.

**Authentication:** Required (authenticated users only)

**Request Body:**
```json
{
  "items": [
    {
      "productId": "product123",
      "productName": "Product Name",
      "quantity": 2,
      "price": 50.00
    }
  ],
  "totalAmount": 110.00,
  "paymentMethod": "bank_transfer",
  "useCalculatedTotal": false,
  "includeVAT": true,
  "vatRate": 0.10,
  "shippingAddress": {
    "fullName": "John Doe",
    "phone": "0123456789",
    "address": "123 Main St",
    "city": "Ho Chi Minh",
    "district": "District 1",
    "ward": "Ward 1",
    "notes": "Delivery notes"
  },
  "notes": "Order notes",
  "customerInfo": {
    "fullName": "John Doe",
    "phone": "0123456789"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "order": {
      "_id": "...",
      "orderNumber": "POINTBOARDA123456",
      "totalAmount": 110.00,
      "subtotal": 100.00,
      "vatAmount": 10.00,
      "vatRate": 0.10,
      "paymentStatus": "pending",
      "orderStatus": "pending",
      "items": [...],
      "createdAt": "2024-01-15T10:30:00.000Z"
    },
    "paymentCode": "POINTBOARDA123456",
    "message": "Order created successfully. Use order number POINTBOARDA123456 for payment."
  }
}
```

### 3. Create Order from Reference (Existing)
**POST** `/api/orders/create-from-ref`

Creates an order using a pre-existing order reference (for backward compatibility).

**Request Body:**
```json
{
  "orderRef": "POINTBOARDA123456",
  "transactionStatus": "completed",
  "paymentMethod": "bank_transfer",
  "totalAmount": 100.00,
  "items": [...],
  "customerInfo": {...}
}
```

## Workflow for Consistent Order Numbers

### Option 1: Generate First, Then Create Order
1. **Generate Order Number:**
   ```
   GET /api/orders/generate-order-number
   ```
   - Returns a unique order number
   - Use this exact number for payment code

2. **Create Order:**
   ```
   POST /api/orders/
   ```
   - Automatically generates a new unique order number
   - The generated number is guaranteed to match the payment code

### Option 2: Create Order Directly
1. **Create Order:**
   ```
   POST /api/orders/
   ```
   - Automatically generates a unique order number
   - Returns the order number as `paymentCode` in response
   - Use this `paymentCode` for payment

## Key Features

### 1. Uniqueness Guarantee
- Order numbers are checked against the database to ensure uniqueness
- Retry mechanism (up to 10 attempts) if collision occurs
- Error handling for maximum attempts exceeded

### 2. Consistency Assurance
- The same order number is used for both database storage and payment codes
- No possibility of mismatch between payment code and database record

### 3. Validation
- Order number format validation (`POINTBOARD[A-Z][0-9]{6}`)
- Total amount validation against item prices (with 1 cent tolerance)
- Option to use calculated total instead of provided total
- Required field validation

### 4. Total Amount Handling
- **Strict Mode** (`useCalculatedTotal: false`): Validates that provided total matches calculated total
- **Flexible Mode** (`useCalculatedTotal: true`): Uses calculated total from items automatically
- **Tolerance**: 1 cent tolerance for floating-point precision issues
- **Detailed Error Messages**: Shows exact difference when validation fails

### 5. VAT Support
- **Automatic VAT Calculation**: Calculates VAT based on subtotal
- **Configurable VAT Rate**: Default 10% (0.10), can be customized
- **VAT Breakdown**: Stores subtotal, VAT amount, and VAT rate separately
- **Flexible VAT Handling**: Can include or exclude VAT from calculations

## Frontend Implementation Example

```javascript
// Option 1: Generate order number first
const generateOrderNumber = async () => {
  const response = await fetch('/api/orders/generate-order-number', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  const data = await response.json();
  return data.data.orderNumber;
};

// Option 2: Create order directly
const createOrder = async (orderData) => {
  const response = await fetch('/api/orders/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(orderData)
  });
  
  const data = await response.json();
  
  // Use the paymentCode for payment
  const paymentCode = data.data.paymentCode;
  
  // Display payment code to user
  showPaymentCode(paymentCode);
  
  return data.data.order;
};

// Example usage
const handleCheckout = async () => {
  try {
    // Calculate subtotal from items (without VAT)
    const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    // Calculate total with VAT (10%)
    const vatRate = 0.10;
    const vatAmount = subtotal * vatRate;
    const totalWithVAT = subtotal + vatAmount;
    
    const order = await createOrder({
      items: cartItems,
      totalAmount: totalWithVAT, // Total including VAT
      includeVAT: true, // Include VAT in calculations
      vatRate: vatRate, // 10% VAT rate
      useCalculatedTotal: true, // Let the system use calculated total
      shippingAddress: address,
      customerInfo: customerInfo
    });
    
    // The paymentCode is guaranteed to match the order.orderNumber
    console.log('Payment code:', order.paymentCode);
    console.log('Order number in DB:', order.order.orderNumber);
    console.log('Price breakdown:', {
      subtotal: order.order.subtotal,
      vatAmount: order.order.vatAmount,
      total: order.order.totalAmount
    });
    
  } catch (error) {
    console.error('Error creating order:', error);
    
    // Handle total amount mismatch error
    if (error.message.includes('Total amount')) {
      console.log('Total amount mismatch detected. Check VAT calculations.');
    }
  }
};
```

## Payment Integration

### SePay Integration
When using SePay for payments:

1. **Generate or get order number** from the API
2. **Use the exact order number** as the payment reference
3. **Display the order number** to the customer for payment
4. **SePay webhook** will receive the order number in the payment content
5. **Order creation** will use the same order number from the webhook

### Example Payment Flow
1. Customer creates order → Gets `POINTBOARDA123456`
2. Customer pays using `POINTBOARDA123456` as reference
3. SePay webhook receives payment with `POINTBOARDA123456` in content
4. Order is created/updated using the same `POINTBOARDA123456`
5. Perfect match between payment code and database record

## Error Handling

### Common Errors
- **400**: Invalid order number format
- **400**: Total amount mismatch (with detailed difference information)
- **400**: Missing required fields
- **500**: Unable to generate unique order number

### Retry Logic
- Order number generation retries up to 10 times if collision occurs
- Automatic fallback to new random numbers
- Clear error messages for debugging

## Migration Notes

### For Existing Systems
- The `/api/orders/create-from-ref` endpoint remains available for backward compatibility
- Existing orders with different number formats will continue to work
- New orders should use the new generation system for consistency

### Database Considerations
- Order numbers are unique in the database
- Index on `orderNumber` field for fast lookups
- No changes required to existing order data 