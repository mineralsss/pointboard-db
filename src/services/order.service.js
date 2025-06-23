const Order = require('../models/order.model');
const User = require('../models/user.model');
const APIError = require('../utils/APIError');
const emailService = require('./email.service');

class OrderService {
  // Create a new order
  async createOrder(orderData, userId) {
    try {
      console.log('[ORDER] Creating order for user:', userId);
      console.log('[ORDER] Order data:', JSON.stringify(orderData, null, 2));
      
      // Validate user exists
      const user = await User.findById(userId);
      if (!user) {
        throw new APIError(404, 'User not found');
      }
      
      console.log('[ORDER] User found:', user.email);

      // Calculate total amount
      const totalAmount = orderData.items.reduce((total, item) => {
        return total + (item.price * item.quantity);
      }, 0);

      // Prepare order data
      const orderPayload = {
        userId,
        customerInfo: {
          firstName: orderData.customerInfo.firstName || user.firstName,
          lastName: orderData.customerInfo.lastName || user.lastName,
          email: orderData.customerInfo.email || user.email,
          phone: orderData.customerInfo.phone || user.phoneNumber,
          address: orderData.customerInfo.address || user.address
        },
        items: orderData.items.map(item => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          price: item.price,
          totalPrice: item.price * item.quantity
        })),
        totalAmount,
        currency: orderData.currency || 'VND',
        paymentMethod: orderData.paymentMethod || 'bank_transfer',
        notes: orderData.notes,
        metadata: orderData.metadata || {}
      };

      console.log('[ORDER] Saving order to database...');
      // Create order
      const order = new Order(orderPayload);
      await order.save();
      
      console.log('[ORDER] Order saved successfully:', order.orderRef);

      // Send order confirmation email asynchronously (don't wait)
      setImmediate(() => {
        this.sendOrderConfirmationEmail(order).catch(emailError => {
          console.error('Failed to send order confirmation email:', emailError);
        });
      });

      return {
        success: true,
        order: order,
        message: 'Order created successfully'
      };
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  }

  // Get order by ID
  async getOrderById(orderId, userId = null) {
    try {
      let query = { _id: orderId };
      
      // If userId provided, ensure user can only see their own orders
      if (userId) {
        query.userId = userId;
      }

      const order = await Order.findOne(query).populate('userId', 'firstName lastName email');
      
      if (!order) {
        throw new APIError(404, 'Order not found');
      }

      return order;
    } catch (error) {
      console.error('Error fetching order:', error);
      throw error;
    }
  }

  // Get order by reference
  async getOrderByRef(orderRef, userId = null) {
    try {
      let query = { orderRef };
      
      // If userId provided, ensure user can only see their own orders
      if (userId) {
        query.userId = userId;
      }

      const order = await Order.findOne(query).populate('userId', 'firstName lastName email');
      
      if (!order) {
        throw new APIError(404, 'Order not found');
      }

      return order;
    } catch (error) {
      console.error('Error fetching order:', error);
      throw error;
    }
  }

  // Get user's orders
  async getUserOrders(userId, options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        status,
        paymentStatus,
        sortBy = '-createdAt'
      } = options;

      let filter = { userId };
      
      if (status) filter.status = status;
      if (paymentStatus) filter.paymentStatus = paymentStatus;

      const orders = await Order.paginate(filter, {
        page,
        limit,
        sortBy,
        populate: 'userId'
      });

      return orders;
    } catch (error) {
      console.error('Error fetching user orders:', error);
      throw error;
    }
  }

  // Update order status
  async updateOrderStatus(orderId, status, userId = null) {
    try {
      let query = { _id: orderId };
      
      // If userId provided, ensure user can only update their own orders
      if (userId) {
        query.userId = userId;
      }

      const order = await Order.findOneAndUpdate(
        query,
        { status },
        { new: true, runValidators: true }
      );

      if (!order) {
        throw new APIError(404, 'Order not found');
      }

      return order;
    } catch (error) {
      console.error('Error updating order status:', error);
      throw error;
    }
  }

  // Update payment status (usually called by payment webhooks)
  async updatePaymentStatus(orderRef, paymentData) {
    try {
      const order = await Order.findOneAndUpdate(
        { orderRef },
        {
          paymentStatus: 'paid',
          paymentDetails: {
            paymentId: paymentData.paymentId || paymentData.id,
            gateway: paymentData.gateway,
            transactionDate: paymentData.transactionDate,
            transferAmount: paymentData.transferAmount,
            referenceCode: paymentData.referenceCode,
            description: paymentData.description
          }
        },
        { new: true, runValidators: true }
      );

      if (!order) {
        throw new APIError(404, 'Order not found');
      }

      // Send payment confirmation email asynchronously (don't wait)
      setImmediate(() => {
        this.sendPaymentConfirmationEmail(order).catch(emailError => {
          console.error('Failed to send payment confirmation email:', emailError);
        });
      });

      return order;
    } catch (error) {
      console.error('Error updating payment status:', error);
      throw error;
    }
  }

  // Cancel order
  async cancelOrder(orderId, userId = null, reason = '') {
    try {
      let query = { _id: orderId };
      
      // If userId provided, ensure user can only cancel their own orders
      if (userId) {
        query.userId = userId;
      }

      const order = await Order.findOne(query);
      
      if (!order) {
        throw new APIError(404, 'Order not found');
      }

      // Check if order can be cancelled
      if (order.status === 'delivered' || order.status === 'cancelled') {
        throw new APIError(400, 'Order cannot be cancelled');
      }

      order.status = 'cancelled';
      order.notes = order.notes ? `${order.notes}\nCancelled: ${reason}` : `Cancelled: ${reason}`;
      await order.save();

      return order;
    } catch (error) {
      console.error('Error cancelling order:', error);
      throw error;
    }
  }

  // Send order confirmation email
  async sendOrderConfirmationEmail(order) {
    try {
      const emailContent = this.generateOrderConfirmationEmail(order);
      
      await emailService.sendEmail(
        order.customerInfo.email,
        `Order Confirmation - ${order.orderRef}`,
        emailContent
      );
    } catch (error) {
      console.error('Error sending order confirmation email:', error);
      throw error;
    }
  }

  // Send payment confirmation email
  async sendPaymentConfirmationEmail(order) {
    try {
      const emailContent = this.generatePaymentConfirmationEmail(order);
      
      await emailService.sendEmail(
        order.customerInfo.email,
        `Payment Received - ${order.orderRef}`,
        emailContent
      );
    } catch (error) {
      console.error('Error sending payment confirmation email:', error);
      throw error;
    }
  }

  // Generate order confirmation email content
  generateOrderConfirmationEmail(order) {
    const itemsHtml = order.items.map(item => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.productName}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${item.price.toLocaleString()} ${order.currency}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${item.totalPrice.toLocaleString()} ${order.currency}</td>
      </tr>
    `).join('');

    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #4c1275; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f9f9f9; }
        .order-details { background-color: white; padding: 20px; margin: 20px 0; border-radius: 8px; }
        table { width: 100%; border-collapse: collapse; }
        th { background-color: #f8f9fa; padding: 12px; text-align: left; }
        .total { font-weight: bold; background-color: #e9ecef; }
        .footer { text-align: center; color: #666; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Order Confirmation</h1>
          <p>Thank you for your order!</p>
        </div>
        <div class="content">
          <div class="order-details">
            <h3>Order Details</h3>
            <p><strong>Order Reference:</strong> ${order.orderRef}</p>
            <p><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
            <p><strong>Customer:</strong> ${order.customerInfo.firstName} ${order.customerInfo.lastName}</p>
            <p><strong>Email:</strong> ${order.customerInfo.email}</p>
            <p><strong>Phone:</strong> ${order.customerInfo.phone}</p>
            <p><strong>Address:</strong> ${order.customerInfo.address}</p>
          </div>
          
          <div class="order-details">
            <h3>Items Ordered</h3>
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th style="text-align: center;">Quantity</th>
                  <th style="text-align: right;">Price</th>
                  <th style="text-align: right;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
                <tr class="total">
                  <td colspan="3" style="padding: 15px; text-align: right;"><strong>Total Amount:</strong></td>
                  <td style="padding: 15px; text-align: right;"><strong>${order.totalAmount.toLocaleString()} ${order.currency}</strong></td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div class="order-details">
            <h3>Payment Information</h3>
            <p><strong>Payment Method:</strong> ${order.paymentMethod}</p>
            <p><strong>Payment Status:</strong> ${order.paymentStatus}</p>
            ${order.paymentStatus === 'pending' ? `
              <p style="color: #d63384;"><strong>Payment Required:</strong> Please complete your payment to process this order.</p>
            ` : ''}
          </div>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} PointBoard. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
    `;
  }

  // Generate payment confirmation email content
  generatePaymentConfirmationEmail(order) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #198754; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f9f9f9; }
        .payment-details { background-color: white; padding: 20px; margin: 20px 0; border-radius: 8px; }
        .success { color: #198754; font-weight: bold; }
        .footer { text-align: center; color: #666; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Payment Received</h1>
          <p>Your payment has been successfully processed!</p>
        </div>
        <div class="content">
          <div class="payment-details">
            <h3>Payment Details</h3>
            <p><strong>Order Reference:</strong> ${order.orderRef}</p>
            <p><strong>Amount Paid:</strong> <span class="success">${order.totalAmount.toLocaleString()} ${order.currency}</span></p>
            <p><strong>Payment Date:</strong> ${new Date().toLocaleDateString()}</p>
            <p><strong>Gateway:</strong> ${order.paymentDetails?.gateway || 'N/A'}</p>
            <p><strong>Reference Code:</strong> ${order.paymentDetails?.referenceCode || 'N/A'}</p>
          </div>
          
          <div class="payment-details">
            <h3>Next Steps</h3>
            <p>Your order is now being processed. You will receive another email with tracking information once your order ships.</p>
            <p>Thank you for choosing PointBoard!</p>
          </div>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} PointBoard. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
    `;
  }
}

module.exports = new OrderService(); 