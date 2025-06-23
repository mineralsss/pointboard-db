const path = require('path');
const Transaction = require(path.resolve(__dirname, '../models/transaction.model.js'));
const orderService = require('../services/order.service');

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
    
    // Extract order reference from content if present
    let orderRef = null;
    if (req.body.content) {
      const orderRefMatch = req.body.content.match(/PointBoard-?([A-Z0-9]+)/i);
      if (orderRefMatch) {
        orderRef = orderRefMatch[1];
      }
    }

    // If order reference found, update order payment status
    if (orderRef) {
      try {
        console.log(`Updating payment status for order: ${orderRef}`);
        
        const paymentData = {
          paymentId: req.body.id,
          gateway: req.body.gateway,
          transactionDate: req.body.transactionDate,
          transferAmount: req.body.transferAmount,
          referenceCode: req.body.referenceCode,
          description: req.body.description || req.body.content
        };

        await orderService.updatePaymentStatus(orderRef, paymentData);
        console.log(`Payment status updated successfully for order: ${orderRef}`);
      } catch (orderError) {
        console.error(`Failed to update order payment status for ${orderRef}:`, orderError);
        // Don't fail the webhook if order update fails
      }
    }
    
    return res.status(200).json({ 
      success: true, 
      orderRef: orderRef,
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
    const { orderRef } = req.params;
    
    if (!orderRef) {
      return res.status(400).json({
        success: false,
        message: "Order reference is required"
      });
    }

    // Check if order exists and get its payment status
    try {
      const order = await orderService.getOrderByRef(orderRef);
      
      return res.status(200).json({
        success: true,
        verified: order.paymentStatus === 'paid',
        order: {
          orderRef: order.orderRef,
          status: order.status,
          paymentStatus: order.paymentStatus,
          totalAmount: order.totalAmount,
          currency: order.currency
        },
        message: order.paymentStatus === 'paid' ? 'Payment verified' : 'Payment pending'
      });
    } catch (orderError) {
      console.log(`Order not found for reference: ${orderRef}`);
      return res.status(404).json({
        success: false,
        verified: false,
        message: "Order not found"
      });
    }
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