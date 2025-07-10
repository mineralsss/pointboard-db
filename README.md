# PointBoard Database API

## Automatic Order Payment Status Update

The system now automatically updates order payment status from "pending" to "completed" when payment transactions are received. This feature ensures that orders are automatically marked as paid when the corresponding bank transfer is detected.

### How It Works

1. **Transaction Processing**: When a transaction is received (via webhook, API endpoint, or manual entry), the system automatically searches for matching pending orders.

2. **Order Matching**: The system matches transactions to orders using:
   - Direct order number match
   - Frontend order reference match
   - Order number extraction from transaction content/description
   - Case-insensitive matching

3. **Amount Verification**: Before updating, the system verifies that the transaction amount matches the order amount (with a 1000 VND tolerance).

4. **Automatic Update**: If a match is found and amounts are verified, the order is automatically updated:
   - `paymentStatus` → `completed`
   - `orderStatus` → `confirmed`
   - `transactionId` → linked to the transaction
   - `paymentDetails` → populated with transaction information

### Integration Points

The automatic update is integrated into all transaction processing endpoints:

- **POST `/api/transaction`** - Main transaction endpoint
- **Webhook Server** - SePay webhook processing
- **PATCH `/api/transactions/:transactionId/complete`** - Transaction completion
- **GET `/api/transactions/verify/:transactionId`** - Transaction verification
- **Payment Controller** - SePay webhook controller

### Manual Update Endpoint

For retroactive updates or manual processing:

```
POST /api/v1/orders/update-payment-status
```

This endpoint processes all existing completed transactions and updates any matching pending orders.

### Test Endpoint

To verify the functionality:

```
GET /api/v1/test/auto-payment-update
```

This endpoint shows pending orders, completed transactions, and tests the automatic update process.

### Configuration

- **Amount Tolerance**: 1000 VND (configurable in the `updateOrderPaymentStatus` function)
- **Order Number Pattern**: `POINTBOARD[A-Z][0-9]{6}` (case-insensitive)
- **Payment Statuses**: Only updates orders with `paymentStatus: 'pending'`

### Logging

The system provides detailed logging for all automatic updates:

```
🔄 [AUTO UPDATE] Checking for orders to update with transaction: {...}
🔄 [AUTO UPDATE] Found X pending orders to update
✅ [AUTO UPDATE] Order POINTBOARDA123456 updated to completed payment
   - Order amount: 50000 VND
   - Transaction amount: 50000 VND
   - Difference: 0 VND
✅ [AUTO UPDATE] Successfully updated X orders
```

### Error Handling

- Amount mismatches are logged but don't prevent other updates
- Database errors are caught and logged
- The system continues processing even if individual updates fail