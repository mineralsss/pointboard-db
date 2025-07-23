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

const app = express();

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 
  (process.env.NODE_ENV === 'production' 
    ? (() => { 
        console.error("MONGODB_URI must be set in production!"); 
        process.exit(1); 
      })()
    : "mongodb://localhost:27017/chotuananhne"
  );

console.log(`Connecting to MongoDB: ${MONGODB_URI.replace(/\/\/.*@/, '//***:***@')}`); // Hide credentials in logs

mongoose
  .connect(
    MONGODB_URI,
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

// GET all orders
app.get('/api/allorders', async (req, res) => {
  try {
    const orders = await Order.find({});
    res.status(200).json({ success: true, orders });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// GET all users
app.get('api/allusers', async (req, res) => {
  try {
    const users = await User.find({});
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
    const orderIdPattern = transactionId.match(/PointBoardORDER(\d+)/)?.[1];
    
    if (!orderIdPattern) {
      return res.status(400).json({
        success: false,
        message: 'Invalid transaction ID format'
      });
    }
    
    console.log(`[STATUS] Checking for order ID pattern: PointBoardORDER${orderIdPattern}`);
    
    // Find all transactions that might contain this order ID in their description
    const transactions = await Transaction.find({});
    
    // Filter transactions to find one with matching order pattern in description
    const matchingTransaction = transactions.find(transaction => {
      const description = transaction.description || '';
      return description.includes(`PointBoardORDER${orderIdPattern}`);
    });
    
    if (!matchingTransaction) {
      console.log(`[STATUS] No transaction found with order pattern: PointBoardORDER${orderIdPattern}`);
      return res.status(404).json({ 
        success: false, 
        message: 'Transaction not found' 
      });
    }
    
    console.log(`[STATUS] Found matching transaction: ${matchingTransaction._id}`);
    
    return res.status(200).json({
      success: true,
      status: 'succeeded', // Since we found a match, consider it successful
      transactionId: transactionId,
      amount: matchingTransaction.transferAmount,
      timestamp: matchingTransaction.transactionDate,
      gateway: matchingTransaction.gateway,
      description: matchingTransaction.description
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

// Add this endpoint to your Express app in index.js or routes file

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

    if (!transaction) {
      console.log(`[VERIFY] No transaction found for: ${transactionId}`);
      return res.status(200).json({
        exists: false,
        status: 'not_found'
      });
    }

    // Update the transaction status to 'verified' if not already
    if (transaction.status !== 'received') {
      transaction.status = 'received';
      await transaction.save();
      console.log(`[VERIFY] Transaction ${transactionId} status updated to 'received'`);
    }

    return res.status(200).json({
      exists: true,
      status: transaction.status,
      transactionId: transaction.referenceCode,
      amount: transaction.transferAmount,
      description: transaction.content
    });
  } catch (error) {
    return res.status(500).json({
      exists: false,
      status: 'error',
      error: error.message
    });
  }
});

// Error handling middleware
const { errorConverter, errorHandler } = require('./middlewares/error.middleware');
app.use(errorConverter);
app.use(errorHandler);

// 404 handler
app.use("/{*any}", (req, res) => {
  console.log(`Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ error: "Route not found" });
});

// Put this AFTER all your other routes, just before starting the server
app.use("*notFound", (req, res) => {
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

  server.close(() => {
    console.log("[APP] Main server closed");

    webhookServer.close(() => {
      console.log("[WEBHOOK] Webhook server closed");
      mongoose.connection.close();
      process.exit(0);
    });
  });
});

module.exports = app;
