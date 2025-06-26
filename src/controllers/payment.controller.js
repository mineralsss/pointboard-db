const path = require('path');
const Transaction = require(path.resolve(__dirname, '../models/transaction.model.js'));

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
      console.log('Transaction saved successfully:', savedTransaction._id);
    } catch (err) {
      console.error('❌ Error saving transaction:', err);
      // Still continue to respond to the webhook
    }
    
    // Extract order number from referenceCode or content
    let orderNumber = null;
    
    // First try to use the referenceCode directly if it matches POINTBOARD format
    if (req.body.referenceCode && req.body.referenceCode.match(/^POINTBOARD[A-Z][0-9]{6}$/i)) {
      orderNumber = req.body.referenceCode.toUpperCase();
      console.log('Found order number from referenceCode:', orderNumber);
    }
    // Otherwise extract from content
    else if (req.body.content) {
      const orderNumberMatch = req.body.content.match(/POINTBOARD([A-Z][0-9]{6})/i);
      if (orderNumberMatch) {
        orderNumber = `POINTBOARD${orderNumberMatch[1]}`;
        console.log('Found order number from content:', orderNumber);
      }
    }
    
    // If order number found, try to update the order status
    if (orderNumber) {
      try {
        const Order = require(path.resolve(__dirname, '../models/order.model.js'));
        const order = await Order.findOne({ orderNumber: orderNumber });
        
        if (order) {
          order.paymentStatus = 'completed';
          order.transactionId = savedTransaction._id;
          await order.save();
          console.log(`✅ Updated order ${orderNumber} payment status to completed`);
        } else {
          console.log(`⚠️ Order ${orderNumber} not found in database`);
        }
      } catch (orderError) {
        console.error('❌ Error updating order:', orderError);
      }
    }
    
    return res.status(200).json({ 
      success: true, 
      orderNumber: orderNumber,
      message: 'Payment notification received' 
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