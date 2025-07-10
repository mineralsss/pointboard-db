require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const mongoose = require("mongoose");
const http = require("http");
const Transaction = require('./models/transaction.model');
const Order = require('./models/order.model');
const User = require('./models/user.model');
const { errorConverter, errorHandler } = require('./middlewares/error.middleware');
const Review = require('./models/review.model.js');

const app = express();

// Connect to MongoDB
mongoose
  .connect(
    process.env.MONGODB_URI || "mongodb://localhost:27017/chotuananhne",
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 15000, // Increase timeout
      socketTimeoutMS: 45000, // Increase socket timeout
    }
  )
  .then(() => console.log("Connected to MongoDB"))
  .catch((error) => console.error("MongoDB connection error:", error));

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("combined")); //theo dõi log GET, POST...
// Routes
app.use("/api/v1", require("./routes/index"));
app.use("/api", require("./routes/index"));

app.get("/", (req, res) => {
  res.json({ message: "Server is running!" });
});

// Sample POST endpoint
app.post("/api/data", (req, res) => {
  try {
    // Process your data here
    console.log("Received data:", req.body);

    // Return success status code
    return res.status(200).json({
      success: true,
      message: "Data successfully processed",
    });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// POST endpoint to handle bank transactions
app.post("/api/transaction", async (req, res) => {
  try {
    const transaction = req.body;

    // Log the received transaction data
    console.log("Received transaction:", transaction);

    // Validate that required fields exist
    const requiredFields = [
      "gateway",
      "transactionDate",
      "accountNumber",
      "transferType",
      "transferAmount",
      "referenceCode",
    ];

    for (const field of requiredFields) {
      if (!transaction[field]) {
        return res.status(400).json({
          success: false,
          message: `Missing required field: ${field}`,
        });
      }
    }

    // Save the transaction to MongoDB
    const newTransaction = new Transaction({
      gateway: transaction.gateway,
      transactionDate: transaction.transactionDate,
      accountNumber: transaction.accountNumber,
      subAccount: transaction.subAccount,
      code: transaction.code,
      content: transaction.content,
      transferType: transaction.transferType,
      description: transaction.description,
      transferAmount: transaction.transferAmount,
      referenceCode: transaction.referenceCode,
      accumulated: transaction.accumulated || 0,
      status: 'received' // or whatever initial status you want
    });

    await newTransaction.save();

    return res.status(200).json({
      success: true,
      message: "Transaction processed and saved successfully",
    });
  } catch (error) {
    console.error("Error processing transaction:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

// GET all users
app.get('/api/v1/allusers', async (req, res) => {
  try {
    const users = await User.find({}).sort('-createdAt'); // Sort by newest first
    res.status(200).json({ success: true, users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Backend endpoint for checking transaction status
app.get('/api/transactions/:transactionId/status', async (req, res) => {
  try {
    const { transactionId } = req.params;
    
    console.log(`[STATUS] Checking for transaction ID: ${transactionId}`);
    
    // Try direct match with referenceCode first
    let transaction = await Transaction.findOne({ referenceCode: transactionId });
    
    // If not found, try matching in content field
    if (!transaction) {
      transaction = await Transaction.findOne({
        content: { $regex: transactionId, $options: 'i' }
      });
    }
    
    // If still not found, try matching in description field
    if (!transaction) {
      transaction = await Transaction.findOne({
        description: { $regex: transactionId, $options: 'i' }
      });
    }
    
    if (!transaction) {
      console.log(`[STATUS] No transaction found for: ${transactionId}`);
      return res.status(404).json({ 
        success: false, 
        message: 'Transaction not found' 
      });
    }
    
    console.log(`[STATUS] Found matching transaction: ${transaction._id}`);
    
    return res.status(200).json({
      success: true,
      status: 'succeeded', // Since we found a match, consider it successful
      transactionId: transactionId,
      amount: transaction.transferAmount,
      timestamp: transaction.transactionDate,
      gateway: transaction.gateway,
      description: transaction.description
    });
    
  } catch (error) {
    console.error('[STATUS] Error fetching transaction status:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error fetching transaction status', 
      error: error.message 
    });
  }
});

/**
 * Endpoint to verify if a transaction exists and check its status
 */
app.get('/api/transactions/verify/:transactionId', async (req, res) => {
  try {
    const { transactionId } = req.params;
    console.log(`[VERIFY] Checking transaction: ${transactionId}`);

    // Try direct match with referenceCode
    let transaction = await Transaction.findOne({ referenceCode: transactionId });

    // If not found, try regex match in description (case-insensitive)
    if (!transaction) {
      transaction = await Transaction.findOne({
        description: { $regex: transactionId, $options: 'i' }
      });
    }

    // If not found, try regex match in content (case-insensitive)
    if (!transaction) {
      transaction = await Transaction.findOne({
        content: { $regex: transactionId, $options: 'i' }
      });
    }

    if (!transaction) {
      console.log(`[VERIFY] No transaction found for: ${transactionId}`);
      
      // Check if transactionId matches POINTBOARD format
      if (transactionId.match(/^POINTBOARD[A-Z][0-9]{6}$/i)) {
        console.log(`[VERIFY] Creating stub transaction for: ${transactionId}`);
        
        // Create a stub transaction for pending payment
        const stubTransaction = new Transaction({
          gateway: 'sepay',
          transactionDate: new Date().toISOString(),
          accountNumber: 'pending',
          transferType: 'in',
          description: `Pending payment for ${transactionId}`,
          transferAmount: 0,
          referenceCode: transactionId.toUpperCase(),
          status: 'pending'
        });
        
        await stubTransaction.save();
        console.log(`[VERIFY] Stub transaction created for: ${transactionId}`);
        
        return res.status(200).json({
          exists: true,
          status: 'pending',
          transactionId: transactionId,
          amount: 0,
          description: `Pending payment for ${transactionId}`,
          isStub: true
        });
      }
      
      return res.status(200).json({
        exists: false,
        status: 'not_found'
      });
    }

    // Update the transaction status to 'received' if not already
    if (transaction.status !== 'received' && transaction.status !== 'completed' && transaction.status !== 'success') {
      transaction.status = 'received';
      await transaction.save();
      console.log(`[VERIFY] Transaction ${transactionId} status updated to 'received'`);
    }

    return res.status(200).json({
      exists: true,
      status: transaction.status,
      transactionId: transaction.referenceCode,
      amount: transaction.transferAmount,
      description: transaction.content || transaction.description,
      isStub: false
    });
  } catch (error) {
    console.error('[VERIFY] Error:', error);
    return res.status(500).json({
      exists: false,
      status: 'error',
      error: error.message
    });
  }
});

// Endpoint removed - Use /api/orders/create-from-ref instead

// Update transaction status (for when payment is completed externally)
app.patch('/api/transactions/:transactionId/complete', async (req, res) => {
  try {
    const { transactionId } = req.params;
    const { amount, gateway, accountNumber } = req.body;
    
    console.log(`[UPDATE TRANSACTION] Completing transaction: ${transactionId}`);
    
    // Find the transaction
    let transaction = await Transaction.findOne({ referenceCode: transactionId });
    
    if (!transaction) {
      transaction = await Transaction.findOne({
        content: { $regex: transactionId, $options: 'i' }
      });
    }
    
    if (!transaction) {
      transaction = await Transaction.findOne({
        description: { $regex: transactionId, $options: 'i' }
      });
    }
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }
    
    // Update transaction only - DO NOT auto-create/update orders
    transaction.status = 'completed';
    if (amount) transaction.transferAmount = amount;
    if (gateway) transaction.gateway = gateway;
    if (accountNumber) transaction.accountNumber = accountNumber;
    
    await transaction.save();
    
    console.log(`✅ [UPDATE TRANSACTION] Transaction ${transactionId} updated to completed`);
    console.log('ℹ️  Note: Order NOT auto-updated. Use /api/orders/create-from-ref endpoint.');
    
    return res.status(200).json({
      success: true,
      data: { transaction },
      message: 'Transaction updated successfully. Use create-from-ref endpoint to create order.'
    });
    
  } catch (error) {
    console.error('[UPDATE TRANSACTION] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error updating transaction',
      error: error.message
    });
  }
});

// Debug endpoint to check order creation request
app.post('/api/debug/order-request', (req, res) => {
  console.log('🐛 [DEBUG] Order creation request body:');
  console.log(JSON.stringify(req.body, null, 2));
  
  const { transactionReference, paymentMethod } = req.body;
  
  res.json({
    success: true,
    debug: {
      hasTransactionReference: !!transactionReference,
      transactionReference: transactionReference,
      paymentMethod: paymentMethod,
      isValidFormat: transactionReference ? transactionReference.match(/^POINTBOARD[A-Z][0-9]{6}$/i) : false
    },
    message: 'Debug info logged to console'
  });
});

// Create order from orderRef and provided data
app.post('/api/v1/orders/create-from-ref', async (req, res) => {
  try {
    const {
      orderRef,
      orderNumber: providedOrderNumber, // Accept existing order number
      transactionStatus,
      paymentMethod,
      address,
      items,
      totalAmount,
      customerInfo,
      notes
    } = req.body;
    
    console.log('📦 [CREATE FROM REF] Creating order with data:', {
      orderRef,
      providedOrderNumber,
      transactionStatus,
      paymentMethod,
      totalAmount,
      hasItems: !!items,
      itemsLength: items?.length || 0
    });
    
    // Import the generateOrderNumber function from order controller
    const { generateOrderNumber } = require('./controllers/order.controller');
    
    // Validate required fields
    if (!orderRef) {
      return res.status(400).json({
        success: false,
        message: 'orderRef is required'
      });
    }
    
    // Use provided order number or generate a new one
    let orderNumber;
    if (providedOrderNumber) {
      // Use the provided order number
      orderNumber = providedOrderNumber;
      console.log('🎯 [CREATE FROM REF] Using provided order number:', orderNumber);
      
      // Check if this order number already exists
      const existingOrder = await Order.findOne({ orderNumber: orderNumber });
      if (existingOrder) {
        console.log('⚠️ [CREATE FROM REF] Order already exists with provided order number:', existingOrder.orderNumber);
        return res.status(200).json({
          success: true,
          data: existingOrder,
          message: 'Order already exists'
        });
      }
    } else {
      // Generate a new unique order number as fallback
      try {
        orderNumber = await generateOrderNumber();
        console.log('🎯 [CREATE FROM REF] Generated new order number (fallback):', orderNumber);
      } catch (error) {
        console.error('❌ [CREATE FROM REF] Failed to generate order number:', error);
        return res.status(500).json({
          success: false,
          message: 'Failed to generate order number'
        });
      }
    }
    
    // Validate totalAmount
    if (!totalAmount || totalAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'totalAmount is required and must be greater than 0'
      });
    }
    
    // Check if order already exists (using the order number)
    const existingOrder = await Order.findOne({ orderNumber: orderNumber });
    if (existingOrder) {
      console.log('⚠️ [CREATE FROM REF] Order already exists:', existingOrder.orderNumber);
      return res.status(200).json({
        success: true,
        data: existingOrder,
        message: 'Order already exists'
      });
    }
    
    // Determine payment and order status based on transactionStatus
    let paymentStatus = 'pending';
    let orderStatus = 'pending';
    
    switch (transactionStatus?.toLowerCase()) {
      case 'completed':
      case 'success':
      case 'received':
        paymentStatus = 'completed';
        orderStatus = 'confirmed';
        break;
      case 'pending':
        paymentStatus = 'pending';
        orderStatus = 'pending';
        break;
      case 'failed':
        paymentStatus = 'failed';
        orderStatus = 'cancelled';
        break;
      default:
        paymentStatus = 'pending';
        orderStatus = 'pending';
    }
    
    // Try to find related transaction (search by both orderRef and generated orderNumber)
    let transaction = null;
    let transactionId = null;
    let paymentDetails = null;
    
    try {
      transaction = await Transaction.findOne({ referenceCode: orderRef }) ||
                   await Transaction.findOne({ referenceCode: orderNumber }) ||
                   await Transaction.findOne({ content: { $regex: orderRef, $options: 'i' } }) ||
                   await Transaction.findOne({ content: { $regex: orderNumber, $options: 'i' } }) ||
                   await Transaction.findOne({ description: { $regex: orderRef, $options: 'i' } }) ||
                   await Transaction.findOne({ description: { $regex: orderNumber, $options: 'i' } });
      
      if (transaction) {
        transactionId = transaction._id;
        paymentDetails = {
          gateway: transaction.gateway,
          transactionDate: transaction.transactionDate,
          transferAmount: transaction.transferAmount,
          referenceCode: transaction.referenceCode,
          accountNumber: transaction.accountNumber,
        };
        console.log('✅ Found related transaction:', transaction._id);
        
        // Use transaction amount if no totalAmount provided or if transaction amount is higher
        if (transaction.transferAmount && transaction.transferAmount > 0) {
          console.log(`💰 Using transaction amount: ${transaction.transferAmount} instead of provided: ${totalAmount}`);
        }
      }
    } catch (error) {
      console.log('⚠️ Error finding transaction:', error.message);
    }
    
    // Prepare items
    const orderItems = items && items.length > 0 ? items : [{
      productId: `${orderNumber}-default`,
      productName: 'Product Order',
      quantity: 1,
      price: totalAmount
    }];
    
    // Calculate total from items if items provided
    let calculatedTotal = totalAmount;
    if (items && items.length > 0) {
      calculatedTotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      console.log(`📊 Calculated total from items: ${calculatedTotal}`);
    }
    
    // Prepare order data
    const orderData = {
      user: req.user?.id || '000000000000000000000000', // Default user if not authenticated
      orderNumber: orderNumber,
      frontendOrderRef: orderRef, // Store the frontend order reference
      items: orderItems,
      totalAmount: calculatedTotal,
      paymentMethod: paymentMethod || 'bank_transfer',
      shippingAddress: {
        fullName: customerInfo?.fullName || customerInfo?.name || address?.fullName || 'Customer',
        phone: customerInfo?.phone || address?.phone || '',
        address: address?.address || address?.street || '',
        city: address?.city || 'Ho Chi Minh',
        district: address?.district || 'District 1',
        ward: address?.ward || '',
        notes: address?.notes || ''
      },
      notes: notes || '',
      paymentStatus: paymentStatus,
      orderStatus: orderStatus,
      transactionId: transactionId,
      paymentDetails: paymentDetails
    };
    
    console.log('📦 [CREATE FROM REF] Final order data:', {
      orderNumber: orderData.orderNumber,
      frontendOrderRef: orderData.frontendOrderRef,
      totalAmount: orderData.totalAmount,
      paymentStatus: orderData.paymentStatus,
      orderStatus: orderData.orderStatus,
      itemsCount: orderData.items.length
    });
    
    // Create the order
    const order = await Order.create(orderData);
    
    console.log('✅ [CREATE FROM REF] Order created successfully:', {
      orderNumber: order.orderNumber,
      frontendOrderRef: order.frontendOrderRef,
      totalAmount: order.totalAmount,
      paymentStatus: order.paymentStatus,
      orderStatus: order.orderStatus
    });
    
    return res.status(201).json({
      success: true,
      data: {
        order: order,
        orderNumber: orderNumber, // Backend order number
        orderRef: orderRef, // Frontend order reference
        paymentCode: orderNumber, // This is the code to show on payment
        message: `Order created successfully with ${paymentStatus} payment status. Use order number ${orderNumber} for payment.`
      }
    });
    
  } catch (error) {
    console.error('[CREATE FROM REF] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error creating order',
      error: error.message
    });
  }
});

// Debug endpoint to check recent orders
app.get('/api/v1/debug/recent-orders', async (req, res) => {
  try {
    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select('orderNumber totalAmount paymentStatus orderStatus createdAt items');
    
    console.log('🐛 [DEBUG] Recent orders:');
    recentOrders.forEach(order => {
      console.log(`- ${order.orderNumber}: ${order.totalAmount} ₫ (${order.paymentStatus})`);
    });
    
    // Check for potential issues with order numbers
    const potentialIssues = recentOrders.filter(order => 
      order.orderNumber.toLowerCase().includes('pointboard') && 
      order.orderNumber !== order.orderNumber.toUpperCase()
    );
    
    if (potentialIssues.length > 0) {
      console.log('⚠️ [DEBUG] Potential mixed case issues found:');
      potentialIssues.forEach(order => {
        console.log(`  - ${order.orderNumber} (should be: ${order.orderNumber.toUpperCase()})`);
      });
    }
    
    res.json({
      success: true,
      orders: recentOrders.map(order => ({
        orderNumber: order.orderNumber,
        totalAmount: order.totalAmount,
        paymentStatus: order.paymentStatus,
        orderStatus: order.orderStatus,
        createdAt: order.createdAt,
        itemsCount: order.items?.length || 0,
        items: order.items
      })),
      message: 'Recent orders retrieved'
    });
  } catch (error) {
    console.error('[DEBUG] Error fetching recent orders:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Comprehensive debug endpoint for order number tracking
app.get('/api/v1/debug/order-numbers', async (req, res) => {
  try {
    console.log('🔍 [DEBUG ORDER NUMBERS] Starting comprehensive analysis...');
    
    // Get recent orders
    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(20)
      .select('orderNumber createdAt totalAmount paymentStatus orderStatus');
    
    // Get recent transactions
    const recentTransactions = await Transaction.find()
      .sort({ createdAt: -1 })
      .limit(20)
      .select('referenceCode content description createdAt transferAmount status');
    
    // Analyze order numbers
    const orderAnalysis = recentOrders.map(order => ({
      orderNumber: order.orderNumber,
      createdAt: order.createdAt,
      totalAmount: order.totalAmount,
      paymentStatus: order.paymentStatus,
      orderStatus: order.orderStatus,
      format: /^POINTBOARD[A-Z][0-9]{6}$/.test(order.orderNumber) ? 'VALID' : 'INVALID',
      case: order.orderNumber === order.orderNumber.toUpperCase() ? 'UPPERCASE' : 'MIXED_CASE',
      length: order.orderNumber.length
    }));
    
    // Analyze transactions
    const transactionAnalysis = recentTransactions.map(transaction => {
      const extractedOrderNumbers = [];
      
      // Extract from referenceCode
      if (transaction.referenceCode) {
        const refMatch = transaction.referenceCode.match(/POINTBOARD([A-Z][0-9]{6})/i);
        if (refMatch) {
          extractedOrderNumbers.push({
            source: 'referenceCode',
            value: transaction.referenceCode,
            extracted: `POINTBOARD${refMatch[1]}`,
            normalized: `POINTBOARD${refMatch[1]}`.toUpperCase()
          });
        }
      }
      
      // Extract from content
      if (transaction.content) {
        const contentMatch = transaction.content.match(/POINTBOARD([A-Z][0-9]{6})/i);
        if (contentMatch) {
          extractedOrderNumbers.push({
            source: 'content',
            value: transaction.content,
            extracted: `POINTBOARD${contentMatch[1]}`,
            normalized: `POINTBOARD${contentMatch[1]}`.toUpperCase()
          });
        }
      }
      
      // Extract from description
      if (transaction.description) {
        const descMatch = transaction.description.match(/POINTBOARD([A-Z][0-9]{6})/i);
        if (descMatch) {
          extractedOrderNumbers.push({
            source: 'description',
            value: transaction.description,
            extracted: `POINTBOARD${descMatch[1]}`,
            normalized: `POINTBOARD${descMatch[1]}`.toUpperCase()
          });
        }
      }
      
      return {
        transactionId: transaction._id,
        createdAt: transaction.createdAt,
        transferAmount: transaction.transferAmount,
        status: transaction.status,
        referenceCode: transaction.referenceCode,
        content: transaction.content,
        description: transaction.description,
        extractedOrderNumbers: extractedOrderNumbers
      };
    });
    
    // Find mismatches
    const mismatches = [];
    
    // Check for orders that don't match any transaction
    orderAnalysis.forEach(order => {
      const matchingTransactions = transactionAnalysis.filter(transaction => 
        transaction.extractedOrderNumbers.some(extracted => 
          extracted.normalized === order.orderNumber
        )
      );
      
      if (matchingTransactions.length === 0) {
        mismatches.push({
          type: 'ORDER_WITHOUT_TRANSACTION',
          orderNumber: order.orderNumber,
          order: order
        });
      }
    });
    
    // Check for transactions that don't match any order
    transactionAnalysis.forEach(transaction => {
      transaction.extractedOrderNumbers.forEach(extracted => {
        const matchingOrder = orderAnalysis.find(order => 
          order.orderNumber === extracted.normalized
        );
        
        if (!matchingOrder) {
          mismatches.push({
            type: 'TRANSACTION_WITHOUT_ORDER',
            extractedOrderNumber: extracted.normalized,
            originalValue: extracted.value,
            source: extracted.source,
            transaction: transaction
          });
        }
      });
    });
    
    console.log('🔍 [DEBUG ORDER NUMBERS] Analysis complete');
    console.log(`  - Orders analyzed: ${orderAnalysis.length}`);
    console.log(`  - Transactions analyzed: ${transactionAnalysis.length}`);
    console.log(`  - Mismatches found: ${mismatches.length}`);
    
    res.json({
      success: true,
      analysis: {
        orders: orderAnalysis,
        transactions: transactionAnalysis,
        mismatches: mismatches,
        summary: {
          totalOrders: orderAnalysis.length,
          totalTransactions: transactionAnalysis.length,
          totalMismatches: mismatches.length,
          validOrderNumbers: orderAnalysis.filter(o => o.format === 'VALID').length,
          uppercaseOrderNumbers: orderAnalysis.filter(o => o.case === 'UPPERCASE').length,
          mixedCaseOrderNumbers: orderAnalysis.filter(o => o.case === 'MIXED_CASE').length
        }
      }
    });
    
  } catch (error) {
    console.error('[DEBUG ORDER NUMBERS] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Analytics endpoint for admin dashboard
app.get('/api/v1/analytics', async (req, res) => {
  try {
    console.log('📊 [ANALYTICS] Fetching analytics data');
    
    // Get total orders count
    const totalOrders = await Order.countDocuments();
    
    // Get orders by status
    const ordersByStatus = await Order.aggregate([
      {
        $group: {
          _id: '$orderStatus',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Get orders by payment status
    const ordersByPaymentStatus = await Order.aggregate([
      {
        $group: {
          _id: '$paymentStatus',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Calculate total revenue from multiple sources
    // 1. From completed orders
    const orderRevenueData = await Order.aggregate([
      {
        $match: {
          paymentStatus: 'completed'
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          count: { $sum: 1 }
        }
      }
    ]);

    // 2. From successful transactions (backup calculation)
    const transactionRevenueData = await Transaction.aggregate([
      {
        $match: {
          status: { $in: ['completed', 'success', 'received'] }
        }
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$transferAmount' },
          count: { $sum: 1 }
        }
      }
    ]);

    // 3. From all orders with any payment status (for debugging)
    const allOrdersRevenueData = await Order.aggregate([
      {
        $group: {
          _id: '$paymentStatus',
          totalAmount: { $sum: '$totalAmount' },
          count: { $sum: 1 }
        }
      }
    ]);

    console.log('🔍 [ANALYTICS] Revenue debugging:', {
      orderRevenue: orderRevenueData.length > 0 ? orderRevenueData[0].totalRevenue : 0,
      transactionRevenue: transactionRevenueData.length > 0 ? transactionRevenueData[0].totalAmount : 0,
      allOrdersByStatus: allOrdersRevenueData
    });
    
    // Get recent orders (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentOrders = await Order.countDocuments({
      createdAt: { $gte: sevenDaysAgo }
    });
    
    // Get total users
    const totalUsers = await User.countDocuments();
    
    // Get verified users
    const verifiedUsers = await User.countDocuments({ isVerified: true });
    
    // Get users by role
    const usersByRole = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Get recent transactions (last 7 days)
    const recentTransactions = await Transaction.countDocuments({
      createdAt: { $gte: sevenDaysAgo }
    });
    
    // Calculate total transaction amount
    const transactionData = await Transaction.aggregate([
      {
        $match: {
          status: { $in: ['completed', 'success', 'received'] }
        }
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$transferAmount' },
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Convert arrays to objects for easier access
    const statusCounts = {};
    ordersByStatus.forEach(item => {
      statusCounts[item._id] = item.count;
    });
    
    const paymentStatusCounts = {};
    ordersByPaymentStatus.forEach(item => {
      paymentStatusCounts[item._id] = item.count;
    });
    
    const roleCounts = {};
    usersByRole.forEach(item => {
      roleCounts[item._id] = item.count;
    });
    
    // Prepare analytics data
    const analytics = {
      orders: {
        total: totalOrders,
        pending: statusCounts.pending || 0,
        confirmed: statusCounts.confirmed || 0,
        processing: statusCounts.processing || 0,
        shipped: statusCounts.shipped || 0,
        delivered: statusCounts.delivered || 0,
        cancelled: statusCounts.cancelled || 0,
        recent: recentOrders
      },
      payments: {
        pending: paymentStatusCounts.pending || 0,
        completed: paymentStatusCounts.completed || 0,
        failed: paymentStatusCounts.failed || 0,
        processing: paymentStatusCounts.processing || 0,
        refunded: paymentStatusCounts.refunded || 0
      },
      revenue: {
        total: orderRevenueData.length > 0 ? orderRevenueData[0].totalRevenue : 0,
        completedOrders: orderRevenueData.length > 0 ? orderRevenueData[0].count : 0,
        // Alternative calculation from transactions
        fromTransactions: transactionRevenueData.length > 0 ? transactionRevenueData[0].totalAmount : 0,
        // Debug info
        allOrdersByStatus: allOrdersRevenueData
      },
      users: {
        total: totalUsers,
        verified: verifiedUsers,
        unverified: totalUsers - verifiedUsers,
        byRole: roleCounts
      },
      transactions: {
        total: await Transaction.countDocuments(),
        recent: recentTransactions,
        totalAmount: transactionData.length > 0 ? transactionData[0].totalAmount : 0,
        completedCount: transactionData.length > 0 ? transactionData[0].count : 0
      },
      summary: {
        totalRevenue: orderRevenueData.length > 0 ? orderRevenueData[0].totalRevenue : 0,
        totalOrders: totalOrders,
        totalUsers: totalUsers,
        pendingOrders: statusCounts.pending || 0,
        completedOrders: paymentStatusCounts.completed || 0
      }
    };
    
    console.log('✅ [ANALYTICS] Analytics data prepared:', {
      totalOrders: analytics.orders.total,
      totalRevenue: analytics.revenue.total,
      revenueFromTransactions: analytics.revenue.fromTransactions,
      pendingOrders: analytics.orders.pending,
      totalUsers: analytics.users.total
    });
    
    return res.status(200).json({
      success: true,
      data: analytics,
      message: 'Analytics data retrieved successfully'
    });
    
  } catch (error) {
    console.error('[ANALYTICS] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching analytics data',
      error: error.message
    });
  }
});

// Update order payment status endpoint
app.patch('/api/v1/orders/:orderId/payment-status', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { paymentStatus } = req.body;
    
    console.log('🔄 [PAYMENT UPDATE] Updating payment status:', {
      orderId,
      paymentStatus
    });
    
    // Validate orderId
    if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID'
      });
    }
    
    // Validate payment status
    const validPaymentStatuses = ['pending', 'processing', 'completed', 'failed', 'refunded'];
    if (!paymentStatus || !validPaymentStatuses.includes(paymentStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment status. Must be one of: pending, processing, completed, failed, refunded'
      });
    }
    
    // Find and update the order
    const order = await Order.findByIdAndUpdate(
      orderId,
      { 
        paymentStatus: paymentStatus,
        updatedAt: new Date()
      },
      { 
        new: true,
        runValidators: true
      }
    );
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    console.log('✅ [PAYMENT UPDATE] Order payment status updated:', {
      orderId: order._id,
      orderNumber: order.orderNumber,
      oldStatus: order.paymentStatus,
      newStatus: paymentStatus
    });
    
    return res.status(200).json({
      success: true,
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        paymentStatus: order.paymentStatus,
        orderStatus: order.orderStatus
      },
      message: 'Payment status updated successfully'
    });
    
  } catch (error) {
    console.error('[PAYMENT UPDATE] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error updating payment status',
      error: error.message
    });
  }
});

// Create a review
app.post('/api/v1/reviews', async (req, res) => {
  try {
    const { user, product, order, rating, comment, images } = req.body;
    if (!user || !rating) {
      return res.status(400).json({ success: false, message: 'user and rating are required' });
    }
    const review = await Review.create({ user, product, order, rating, comment, images });
    return res.status(201).json({ success: true, data: review, message: 'Review created' });
  } catch (error) {
    console.error('[REVIEW] Create error:', error);
    return res.status(500).json({ success: false, message: 'Error creating review', error: error.message });
  }
});

// Get all reviews (optionally filter by product/order)
app.get('/api/v1/reviews', async (req, res) => {
  try {
    const { product, order, user } = req.query;
    const filter = {};
    if (product && mongoose.Types.ObjectId.isValid(product)) filter.product = product;
    if (order && mongoose.Types.ObjectId.isValid(order)) filter.order = order;
    if (user && mongoose.Types.ObjectId.isValid(user)) filter.user = user;
    const reviews = await Review.find(filter)
      .sort({ createdAt: -1 })
      .populate('user', 'firstName lastName email')
      .populate('product', 'name')
      .populate('order', 'orderNumber');
    return res.status(200).json({ success: true, data: reviews });
  } catch (error) {
    console.error('[REVIEW] Get all error:', error);
    return res.status(500).json({ success: false, message: 'Error fetching reviews', error: error.message });
  }
});

// Get review by ID
app.get('/api/v1/reviews/:id', async (req, res) => {
  try {
    const review = await Review.findById(req.params.id).populate('user', 'firstName lastName email').populate('product', 'name').populate('order', 'orderNumber');
    if (!review) return res.status(404).json({ success: false, message: 'Review not found' });
    return res.status(200).json({ success: true, data: review });
  } catch (error) {
    console.error('[REVIEW] Get by ID error:', error);
    return res.status(500).json({ success: false, message: 'Error fetching review', error: error.message });
  }
});

// Update review
app.patch('/api/v1/reviews/:id', async (req, res) => {
  try {
    const { rating, comment, images, isApproved } = req.body;
    const review = await Review.findByIdAndUpdate(
      req.params.id,
      { rating, comment, images, isApproved },
      { new: true, runValidators: true }
    );
    if (!review) return res.status(404).json({ success: false, message: 'Review not found' });
    return res.status(200).json({ success: true, data: review, message: 'Review updated' });
  } catch (error) {
    console.error('[REVIEW] Update error:', error);
    return res.status(500).json({ success: false, message: 'Error updating review', error: error.message });
  }
});

// Delete review
app.delete('/api/v1/reviews/:id', async (req, res) => {
  try {
    const review = await Review.findByIdAndDelete(req.params.id);
    if (!review) return res.status(404).json({ success: false, message: 'Review not found' });
    return res.status(200).json({ success: true, message: 'Review deleted' });
  } catch (error) {
    console.error('[REVIEW] Delete error:', error);
    return res.status(500).json({ success: false, message: 'Error deleting review', error: error.message });
  }
});

// Test endpoint for debugging authentication
app.get('/api/v1/test/auth', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    console.log('🔍 [AUTH TEST] Auth header:', authHeader);
    
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'No authorization header found',
        debug: {
          headers: req.headers,
          method: req.method,
          url: req.url
        }
      });
    }
    
    const token = authHeader.replace('Bearer ', '');
    console.log('🔍 [AUTH TEST] Token:', token.substring(0, 20) + '...');
    
    // Try to verify the token
    const jwt = require('jsonwebtoken');
    const secret = process.env.JWT_SECRET_KEY || "your-secret-key";
    
    try {
      const decoded = jwt.verify(token, secret);
      console.log('🔍 [AUTH TEST] Token decoded successfully:', decoded);
      
      return res.status(200).json({
        success: true,
        message: 'Token is valid',
        decoded: {
          sub: decoded.sub,
          userID: decoded.userID,
          id: decoded.id,
          email: decoded.email,
          role: decoded.role
        }
      });
    } catch (jwtError) {
      console.log('🔍 [AUTH TEST] JWT verification failed:', jwtError.message);
      
      return res.status(401).json({
        success: false,
        message: 'Token verification failed',
        error: jwtError.message,
        debug: {
          secretUsed: secret.substring(0, 10) + '...',
          tokenLength: token.length
        }
      });
    }
  } catch (error) {
    console.error('🔍 [AUTH TEST] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Test endpoint to generate token for specific user ID
app.get('/api/v1/test/generate-token/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    console.log('🔍 [GENERATE TOKEN] Generating token for user ID:', userId);
    
    // Find the user
    const User = require('./models/user.model');
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        userId: userId
      });
    }
    
    console.log('🔍 [GENERATE TOKEN] User found:', {
      id: user._id,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
      isActive: user.isActive
    });
    
    // Generate token using the same method as auth controller
    const jwt = require('jsonwebtoken');
    const secret = process.env.JWT_SECRET_KEY || "your-secret-key";
    
    const token = jwt.sign(
      { sub: user._id, userID: user._id, email: user.email, role: user.role },
      secret,
      { expiresIn: '1h' }
    );
    
    console.log('🔍 [GENERATE TOKEN] Token generated successfully');
    
    return res.status(200).json({
      success: true,
      message: 'Token generated successfully',
      data: {
        token: token,
        user: {
          id: user._id,
          email: user.email,
          role: user.role,
          isVerified: user.isVerified,
          isActive: user.isActive
        },
        testCommand: `curl -H "Authorization: Bearer ${token}" http://localhost:3000/api/test/auth`
      }
    });
    
  } catch (error) {
    console.error('🔍 [GENERATE TOKEN] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error generating token',
      error: error.message
    });
  }
});

// Option B: Complete order creation with synchronization
app.post('/api/v1/orders/create-with-sync', async (req, res) => {
  try {
    const {
      frontendOrderRef, // Frontend generated reference
      items,
      totalAmount,
      paymentMethod = 'bank_transfer',
      shippingAddress,
      notes,
      customerInfo,
      transactionStatus,
      useCalculatedTotal = false,
      includeVAT = true,
      vatRate = 0.10
    } = req.body;
    
    console.log('🔄 [CREATE WITH SYNC] Starting synchronized order creation:', {
      frontendOrderRef,
      totalAmount,
      paymentMethod,
      hasItems: !!items,
      itemsLength: items?.length || 0
    });
    
    // Import required functions
    const { generateOrderNumber } = require('./controllers/order.controller');
    
    // Validate required fields
    if (!frontendOrderRef) {
      return res.status(400).json({
        success: false,
        message: 'frontendOrderRef is required for synchronized order creation'
      });
    }
    
    if (!totalAmount || totalAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'totalAmount is required and must be greater than 0'
      });
    }
    
    // Generate backend order number
    let backendOrderNumber;
    try {
      backendOrderNumber = await generateOrderNumber();
      console.log('🎯 [CREATE WITH SYNC] Generated backend order number:', backendOrderNumber);
    } catch (error) {
      console.error('❌ [CREATE WITH SYNC] Failed to generate order number:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to generate order number'
      });
    }
    
    // Check if order already exists with either reference
    const existingOrder = await Order.findOne({
      $or: [
        { orderNumber: backendOrderNumber },
        { frontendOrderRef: frontendOrderRef }
      ]
    });
    
    if (existingOrder) {
      console.log('⚠️ [CREATE WITH SYNC] Order already exists:', {
        orderNumber: existingOrder.orderNumber,
        frontendOrderRef: existingOrder.frontendOrderRef
      });
      return res.status(200).json({
        success: true,
        data: existingOrder,
        message: 'Order already exists',
        syncInfo: {
          backendOrderNumber: existingOrder.orderNumber,
          frontendOrderRef: existingOrder.frontendOrderRef,
          synchronized: existingOrder.orderNumber && existingOrder.frontendOrderRef
        }
      });
    }
    
    // Determine payment and order status
    let paymentStatus = 'pending';
    let orderStatus = 'pending';
    
    switch (transactionStatus?.toLowerCase()) {
      case 'completed':
      case 'success':
      case 'received':
        paymentStatus = 'completed';
        orderStatus = 'confirmed';
        break;
      case 'pending':
        paymentStatus = 'pending';
        orderStatus = 'pending';
        break;
      case 'failed':
        paymentStatus = 'failed';
        orderStatus = 'cancelled';
        break;
      default:
        paymentStatus = 'pending';
        orderStatus = 'pending';
    }
    
    // Prepare items
    const orderItems = items && items.length > 0 ? items : [{
      productId: `${backendOrderNumber}-default`,
      productName: 'Product Order',
      quantity: 1,
      price: totalAmount
    }];
    
    // Calculate totals
    const subtotal = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const vatAmount = includeVAT ? subtotal * vatRate : 0;
    const calculatedTotal = subtotal + vatAmount;
    
    // Determine final total
    let finalTotal = totalAmount;
    if (useCalculatedTotal) {
      finalTotal = calculatedTotal;
    } else {
      const tolerance = 0.01;
      if (Math.abs(calculatedTotal - totalAmount) > tolerance) {
        // Assuming APIError is defined elsewhere or needs to be imported
        // For now, we'll throw a generic error or handle it differently
        // throw new APIError(400, `Total amount mismatch. Provided: ${totalAmount}, Calculated: ${calculatedTotal}`);
        console.warn(`[CREATE WITH SYNC] Total amount mismatch. Provided: ${totalAmount}, Calculated: ${calculatedTotal}. Tolerance: ${tolerance}`);
      }
    }
    
    // Prepare order data
    const orderData = {
      user: req.user?.id || '000000000000000000000000',
      orderNumber: backendOrderNumber,
      frontendOrderRef: frontendOrderRef,
      items: orderItems,
      totalAmount: finalTotal,
      subtotal: subtotal,
      vatAmount: vatAmount,
      vatRate: vatRate,
      paymentMethod: paymentMethod,
      shippingAddress: {
        fullName: customerInfo?.fullName || customerInfo?.name || shippingAddress?.fullName || 'Customer',
        phone: customerInfo?.phone || shippingAddress?.phone || '',
        address: shippingAddress?.address || shippingAddress?.street || '',
        city: shippingAddress?.city || 'Ho Chi Minh',
        district: shippingAddress?.district || 'District 1',
        ward: shippingAddress?.ward || '',
        notes: shippingAddress?.notes || ''
      },
      notes: notes || '',
      paymentStatus: paymentStatus,
      orderStatus: orderStatus
    };
    
    console.log('📦 [CREATE WITH SYNC] Final order data:', {
      backendOrderNumber: orderData.orderNumber,
      frontendOrderRef: orderData.frontendOrderRef,
      totalAmount: orderData.totalAmount,
      paymentStatus: orderData.paymentStatus,
      orderStatus: orderData.orderStatus,
      itemsCount: orderData.items.length
    });
    
    // Create the order
    const order = await Order.create(orderData);
    
    console.log('✅ [CREATE WITH SYNC] Order created successfully:', {
      backendOrderNumber: order.orderNumber,
      frontendOrderRef: order.frontendOrderRef,
      totalAmount: order.totalAmount,
      paymentStatus: order.paymentStatus,
      orderStatus: order.orderStatus
    });
    
    return res.status(201).json({
      success: true,
      data: {
        order: order,
        syncInfo: {
          backendOrderNumber: order.orderNumber,
          frontendOrderRef: order.frontendOrderRef,
          synchronized: true,
          message: 'Order created with perfect synchronization'
        },
        paymentCode: order.orderNumber, // Use backend order number for payment
        message: `Order created successfully with ${paymentStatus} payment status. Use order number ${order.orderNumber} for payment.`
      }
    });
    
  } catch (error) {
    console.error('[CREATE WITH SYNC] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error creating synchronized order',
      error: error.message
    });
  }
});

// Test endpoint for Option B synchronization
app.get('/api/v1/test/option-b-sync', async (req, res) => {
  try {
    console.log('🔍 [OPTION B SYNC TEST] Starting comprehensive test...');
    
    // Get recent orders with frontend references
    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select('orderNumber frontendOrderRef createdAt totalAmount paymentStatus orderStatus user');
    
    // Analyze synchronization
    const syncAnalysis = recentOrders.map(order => ({
      orderNumber: order.orderNumber,
      frontendOrderRef: order.frontendOrderRef,
      createdAt: order.createdAt,
      totalAmount: order.totalAmount,
      paymentStatus: order.paymentStatus,
      orderStatus: order.orderStatus,
      hasFrontendRef: !!order.frontendOrderRef,
      hasBackendNumber: !!order.orderNumber,
      synchronized: !!(order.orderNumber && order.frontendOrderRef),
      format: /^POINTBOARD[A-Z][0-9]{6}$/.test(order.orderNumber) ? 'VALID' : 'INVALID'
    }));
    
    // Calculate statistics
    const stats = {
      totalOrders: syncAnalysis.length,
      withFrontendRef: syncAnalysis.filter(o => o.hasFrontendRef).length,
      withBackendNumber: syncAnalysis.filter(o => o.hasBackendNumber).length,
      synchronized: syncAnalysis.filter(o => o.synchronized).length,
      validFormat: syncAnalysis.filter(o => o.format === 'VALID').length,
      syncPercentage: syncAnalysis.length > 0 ? 
        Math.round((syncAnalysis.filter(o => o.synchronized).length / syncAnalysis.length) * 100) : 0
    };
    
    // Find issues
    const issues = [];
    
    // Orders without frontend refs
    const missingFrontendRefs = syncAnalysis.filter(o => !o.hasFrontendRef);
    if (missingFrontendRefs.length > 0) {
      issues.push({
        type: 'MISSING_FRONTEND_REF',
        count: missingFrontendRefs.length,
        orders: missingFrontendRefs
      });
    }
    
    // Orders without backend numbers
    const missingBackendNumbers = syncAnalysis.filter(o => !o.hasBackendNumber);
    if (missingBackendNumbers.length > 0) {
      issues.push({
        type: 'MISSING_BACKEND_NUMBER',
        count: missingBackendNumbers.length,
        orders: missingBackendNumbers
      });
    }
    
    // Invalid formats
    const invalidFormats = syncAnalysis.filter(o => o.format === 'INVALID');
    if (invalidFormats.length > 0) {
      issues.push({
        type: 'INVALID_FORMAT',
        count: invalidFormats.length,
        orders: invalidFormats
      });
    }
    
    console.log('🔍 [OPTION B SYNC TEST] Analysis complete');
    console.log(`  - Orders analyzed: ${stats.totalOrders}`);
    console.log(`  - Synchronized: ${stats.synchronized}/${stats.totalOrders} (${stats.syncPercentage}%)`);
    console.log(`  - Issues found: ${issues.length}`);
    
    res.json({
      success: true,
      testType: 'Option B Synchronization Test',
      analysis: {
        orders: syncAnalysis,
        statistics: stats,
        issues: issues,
        recommendations: [
          stats.syncPercentage < 100 ? 'Consider implementing Option B for full synchronization' : 'Synchronization is working well',
          stats.validFormat < stats.totalOrders ? 'Some orders have invalid format - check order number generation' : 'All orders have valid format',
          issues.length > 0 ? 'Address the identified issues for better synchronization' : 'No synchronization issues detected'
        ]
      }
    });
    
  } catch (error) {
    console.error('[OPTION B SYNC TEST] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Error handling middleware
app.use(errorConverter);
app.use(errorHandler);

// 404 handler for undefined routes
app.use((req, res) => {
  console.log(`Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ error: "Route not found" });
});

// ---- WEBHOOK SERVER SETUP ----
function setupWebhookServer() {
  // Transaction model (use the one you already created)
  const Transaction = mongoose.model("Transaction");

  // Create a separate HTTP server for webhooks
  const WEBHOOK_PORT = process.env.WEBHOOK_PORT || 7777;

  const webhookServer = http.createServer(async (req, res) => {
    // Set CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    // Log request info
    const clientIP = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    console.log(`[WEBHOOK] Request from ${clientIP}, method: ${req.method}`);

    // Handle OPTIONS requests
    if (req.method === "OPTIONS") {
      res.writeHead(200);
      res.end();
      return;
    }

    // Only accept POST
    if (req.method !== "POST") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({ success: true, message: "Only POST accepted" })
      );
      return;
    }

    // Collect request body
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", async () => {
      try {
        console.log("[WEBHOOK] Received payload:", body);
        
        // Parse the JSON data
        const paymentData = JSON.parse(body);
        
        // Log the incoming data for debugging
        console.log("[WEBHOOK] Processing payment data:", JSON.stringify(paymentData, null, 2));
        
        // Create and save transaction document
        const transaction = new Transaction({
          gateway: paymentData.gateway,
          transactionDate: paymentData.transactionDate,
          accountNumber: paymentData.accountNumber,
          subAccount: paymentData.subAccount,
          code: paymentData.code,
          content: paymentData.content,
          transferType: paymentData.transferType,
          description: paymentData.description, // Make sure this field is saved
          transferAmount: paymentData.transferAmount,
          referenceCode: paymentData.referenceCode,
          accumulated: paymentData.accumulated || 0,
          status: 'received' // Initial status
        });
        
        // Save the transaction
        await transaction.save();
        
        console.log("[WEBHOOK] Transaction saved successfully:", {
          id: transaction._id,
          ref: transaction.referenceCode,
          description: transaction.description // Log to confirm it's saved
        });
        
        // Respond with success
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ 
          success: true, 
          message: "Transaction processed successfully" 
        }));
      } catch (error) {
        console.error("[WEBHOOK] Error processing webhook:", error);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ 
          success: false, 
          message: "Error processing webhook", 
          error: error.message 
        }));
      }
    });
  });

  // Start webhook server
  webhookServer.listen(WEBHOOK_PORT, "0.0.0.0", () => {
    console.log(`[WEBHOOK] Server listening on port ${WEBHOOK_PORT}`);
  });

  return webhookServer;
}

// ---- START YOUR MAIN APP AND WEBHOOK SERVER TOGETHER ----

// Your existing Express app setup
// Set the port for Heroku or use 3000 for local development
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Start the webhook server in the same process
const webhookServer = setupWebhookServer();

// Handle graceful shutdown for both servers
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down servers");

  // Assuming 'server' is defined elsewhere if needed for graceful shutdown
  // For now, we'll close the webhook server directly
  webhookServer.close(() => {
    console.log("[WEBHOOK] Webhook server closed");
    mongoose.connection.close();
    process.exit(0);
  });
});

module.exports = app;
