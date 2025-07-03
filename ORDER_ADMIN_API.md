# Order Admin API Documentation

## Overview
The Order Admin API has been updated to provide global date-based sorting across all pages, ensuring that orders are consistently organized by creation date (newest first) regardless of pagination.

## Endpoints

### 1. Get All Orders (Admin Only)
**GET** `/api/orders/all`

Returns all orders sorted globally by creation date (newest first) with pagination.

#### Query Parameters:
- `page` (number, default: 1) - Page number
- `limit` (number, default: 10) - Number of orders per page
- `status` (string, optional) - Filter by order status
- `paymentStatus` (string, optional) - Filter by payment status
- `search` (string, optional) - Search in order number or product names
- `startDate` (string, optional) - Filter orders from this date (ISO format)
- `endDate` (string, optional) - Filter orders until this date (ISO format)

#### Example Request:
```
GET /api/orders/all?page=1&limit=20&status=pending&startDate=2024-01-01
```

#### Response Format:
```json
{
  "success": true,
  "data": {
    "page": 1,
    "limit": 20,
    "totalPages": 5,
    "totalResults": 100,
    "results": [
      {
        "_id": "...",
        "orderNumber": "POINTBOARDA123456",
        "user": {
          "_id": "...",
          "firstName": "John",
          "lastName": "Doe",
          "email": "john@example.com"
        },
        "totalAmount": 150.00,
        "orderStatus": "pending",
        "paymentStatus": "completed",
        "createdAt": "2024-01-15T10:30:00.000Z",
        "items": [...]
      }
    ],
    "filters": {
      "status": "pending",
      "paymentStatus": null,
      "search": null,
      "startDate": "2024-01-01",
      "endDate": null
    }
  }
}
```

### 2. Get Order Statistics (Admin Only)
**GET** `/api/orders/stats`

Returns order statistics for the admin dashboard.

#### Query Parameters:
- `startDate` (string, optional) - Filter statistics from this date (ISO format)
- `endDate` (string, optional) - Filter statistics until this date (ISO format)

#### Example Request:
```
GET /api/orders/stats?startDate=2024-01-01&endDate=2024-01-31
```

#### Response Format:
```json
{
  "success": true,
  "data": {
    "totalOrders": 150,
    "totalRevenue": 15000.00,
    "ordersByStatus": {
      "pending": { "count": 20, "totalAmount": 2000.00 },
      "confirmed": { "count": 30, "totalAmount": 3000.00 },
      "shipped": { "count": 50, "totalAmount": 5000.00 },
      "delivered": { "count": 40, "totalAmount": 4000.00 },
      "cancelled": { "count": 10, "totalAmount": 1000.00 }
    },
    "ordersByPaymentStatus": {
      "pending": { "count": 15, "totalAmount": 1500.00 },
      "completed": { "count": 120, "totalAmount": 12000.00 },
      "failed": { "count": 15, "totalAmount": 1500.00 }
    },
    "recentOrders": [
      {
        "_id": "...",
        "orderNumber": "POINTBOARDA123456",
        "totalAmount": 150.00,
        "orderStatus": "pending",
        "createdAt": "2024-01-15T10:30:00.000Z",
        "user": {
          "_id": "...",
          "firstName": "John",
          "lastName": "Doe",
          "email": "john@example.com"
        }
      }
    ]
  }
}
```

## Global Date Sorting

### How It Works:
1. **Global Sorting**: All orders are sorted by `createdAt` field in descending order (newest first)
2. **Consistent Ordering**: The same sorting is applied across all pages
3. **Pagination**: After global sorting, pagination is applied to get the correct page

### Benefits:
- **Consistent Experience**: Orders appear in the same order regardless of which page you're viewing
- **Latest Orders First**: Most recent orders always appear at the top
- **Cross-Page Consistency**: If a newer order exists on page 2, it will appear before older orders on page 1

### Example Scenario:
- Page 1: Orders from Jan 15, Jan 14, Jan 13
- Page 2: Orders from Jan 12, Jan 11, Jan 10
- If a new order is created on Jan 16, it will appear at the top of page 1, and all other orders will shift down

## Filtering Options

### Status Filter:
- `pending` - Orders awaiting confirmation
- `confirmed` - Orders confirmed by admin
- `processing` - Orders being processed
- `shipped` - Orders shipped to customer
- `delivered` - Orders delivered to customer
- `cancelled` - Cancelled orders

### Payment Status Filter:
- `pending` - Payment pending
- `processing` - Payment being processed
- `completed` - Payment completed
- `failed` - Payment failed
- `refunded` - Payment refunded

### Search Filter:
- Searches in order number (e.g., "POINTBOARDA123456")
- Searches in product names within order items

### Date Range Filter:
- `startDate`: Filter orders created on or after this date
- `endDate`: Filter orders created on or before this date
- Both dates should be in ISO format (YYYY-MM-DD)

## Frontend Implementation Example

```javascript
// Fetch orders with global date sorting
const fetchOrders = async (page = 1, filters = {}) => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: '20',
    ...filters
  });
  
  const response = await fetch(`/api/orders/all?${params}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  const data = await response.json();
  return data.data;
};

// Fetch order statistics
const fetchOrderStats = async (dateRange = {}) => {
  const params = new URLSearchParams(dateRange);
  
  const response = await fetch(`/api/orders/stats?${params}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  const data = await response.json();
  return data.data;
};

// Example usage
const orders = await fetchOrders(1, {
  status: 'pending',
  startDate: '2024-01-01'
});

const stats = await fetchOrderStats({
  startDate: '2024-01-01',
  endDate: '2024-01-31'
});
```

## Authentication
All admin endpoints require admin authentication. Include the admin JWT token in the Authorization header:
```
Authorization: Bearer <admin-jwt-token>
``` 