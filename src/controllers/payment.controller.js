const path = require('path');
const Transaction = require(path.resolve(__dirname, '../models/transaction.model.js'));
const Order = require(path.resolve(__dirname, '../models/order.model.js'));

// Function to automatically update order payment status when transaction is received
async function updateOrderPaymentStatus(transaction) {
  try {
    console.log('🔄 [AUTO UPDATE] Checking for orders to update with transaction:', {
      referenceCode: transaction.referenceCode,
      content: transaction.content?.substring(0, 50) + '...',
      description: transaction.description?.substring(0, 50) + '...',
      amount: transaction.transferAmount
    });

    // Find orders that match this transaction
    const matchingOrders = await Order.find({
      $or: [
        { orderNumber: transaction.referenceCode },
        { frontendOrderRef: transaction.referenceCode },
        { orderNumber: { $regex: transaction.referenceCode, $options: 'i' } },
        { frontendOrderRef: { $regex: transaction.referenceCode, $options: 'i' } }
      ],
      paymentStatus: 'pending' // Only update pending orders
    });

    // Also search in transaction content and description for order numbers
    const orderNumberPattern = /POINTBOARD[A-Z][0-9]{6}/gi;
    const contentMatches = transaction.content ? transaction.content.match(orderNumberPattern) : [];
    const descriptionMatches = transaction.description ? transaction.description.match(orderNumberPattern) : [];
    
    const allOrderNumbers = [
      transaction.referenceCode,
      ...contentMatches,
      ...descriptionMatches
    ].filter(Boolean);

    // Find orders by extracted order numbers
    for (const orderNumber of allOrderNumbers) {
      const ordersByNumber = await Order.find({
        $or: [
          { orderNumber: orderNumber },
          { orderNumber: orderNumber.toUpperCase() },
          { frontendOrderRef: orderNumber },
          { frontendOrderRef: orderNumber.toUpperCase() }
        ],
        paymentStatus: 'pending'
      });
      matchingOrders.push(...ordersByNumber);
    }

    // Remove duplicates
    const uniqueOrders = matchingOrders.filter((order, index, self) => 
      index === self.findIndex(o => o._id.toString() === order._id.toString())
    );

    console.log(`🔄 [AUTO UPDATE] Found ${uniqueOrders.length} pending orders to update`);

    let updatedCount = 0;
    for (const order of uniqueOrders) {
      // Verify transaction amount matches order amount (with tolerance)
      const amountTolerance = 1000; // 1000 VND tolerance
      const amountDifference = Math.abs(transaction.transferAmount - order.totalAmount);
      
      if (amountDifference <= amountTolerance) {
        // Update order payment status
        order.paymentStatus = 'completed';
        order.orderStatus = 'confirmed';
        order.transactionId = transaction._id;
        order.paymentDetails = {
          gateway: transaction.gateway,
          transactionDate: transaction.transactionDate,
          transferAmount: transaction.transferAmount,
          referenceCode: transaction.referenceCode,
          accountNumber: transaction.accountNumber,
        };
        
        await order.save();
        updatedCount++;
        
        console.log(`✅ [AUTO UPDATE] Order ${order.orderNumber} updated to completed payment`);
        console.log(`   - Order amount: ${order.totalAmount} VND`);
        console.log(`   - Transaction amount: ${transaction.transferAmount} VND`);
        console.log(`   - Difference: ${amountDifference} VND`);
      } else {
        console.log(`⚠️ [AUTO UPDATE] Amount mismatch for order ${order.orderNumber}:`);
        console.log(`   - Order amount: ${order.totalAmount} VND`);
        console.log(`   - Transaction amount: ${transaction.transferAmount} VND`);
        console.log(`   - Difference: ${amountDifference} VND (tolerance: ${amountTolerance} VND)`);
      }
    }

    console.log(`✅ [AUTO UPDATE] Successfully updated ${updatedCount} orders`);
    return updatedCount;
    
  } catch (error) {
    console.error('❌ [AUTO UPDATE] Error updating order payment status:', error);
    return 0;
  }
}

// Middleware to verify SePay IP
const isSePayIP = (ip) => {
  const allowedIPs = ['103.255.238.9']; // SePay webhook IP
  return allowedIPs.includes(ip) || process.env.NODE_ENV === 'development';
};

exports.sePayWebhook = async (req, res) => {
  try {
    const clientIP = req.ip || req.headers['x-forwarded-for'];
    console.log(`Received webhook from IP: ${clientIP}`);
    console.log('Request body:', JSON.stringify(req.body));
    
    try {
      // Create transaction with fields matching the schema
      const transaction = new Transaction({
        gateway: req.body.gateway || 'unknown',
        transactionDate: req.body.transactionDate || new Date().toISOString(),
        accountNumber: req.body.accountNumber || 'unknown',
        subAccount: req.body.subAccount || null,
        code: req.body.code || null,
        content: req.body.content || '',
        transferType: req.body.transferType || 'in',
        description: req.body.description || '',
        transferAmount: req.body.transferAmount || 0,
        referenceCode: req.body.referenceCode || `manual-${Date.now()}`,
        accumulated: req.body.accumulated || 0,
        status: req.body.status,
      });
      
      const savedTransaction = await transaction.save();
      console.log('✅ Transaction saved successfully:', savedTransaction._id);
      
      // Extract order number for logging purposes
      let orderNumber = null;
      if (req.body.referenceCode && req.body.referenceCode.match(/^POINTBOARD[A-Z][0-9]{6}$/i)) {
        orderNumber = req.body.referenceCode.toUpperCase();
      } else if (req.body.content) {
        const orderNumberMatch = req.body.content.match(/POINTBOARD([A-Z][0-9]{6})/i);
        if (orderNumberMatch) {
          orderNumber = `POINTBOARD${orderNumberMatch[1]}`;
        }
      }
      
      console.log(`📝 Transaction received for orderNumber: ${orderNumber || 'N/A'}`);
      
      // Automatically update order payment status if transaction matches any pending orders
      const updatedOrdersCount = await updateOrderPaymentStatus(savedTransaction);
      
      if (updatedOrdersCount > 0) {
        console.log(`💰 [SEPAY WEBHOOK] Automatically updated ${updatedOrdersCount} orders to completed payment`);
      }
      
    } catch (err) {
      console.error('❌ Error saving transaction:', err);
    }
    
    return res.status(200).json({ 
      success: true, 
      message: 'Payment notification received and transaction saved' 
    });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return res.status(200).json({ 
      success: true, 
      message: 'Error processing webhook' 
    });
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    // Implementation details...
    return res.status(200).json({
      success: true,
      verified: false,
      message: "Verification endpoint"
    });
  } catch (error) {
    console.error("Error:", error);
    return res.status(200).json({
      success: true,
      verified: false,
      message: "Error occurred during verification"
    });
  }
};

exports.getTransactionHistory = async (req, res) => {
  try {
    const transactions = await Transaction.find()
      .sort('-createdAt')
      .limit(50);
    
    return res.status(200).json({
      success: true,
      transactions: transactions
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return res.status(200).json({
      success: true,
      transactions: [],
      message: 'Error fetching transaction history'
    });
  }
};