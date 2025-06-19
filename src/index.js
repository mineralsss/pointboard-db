require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const mongoose = require("mongoose");
const http = require("http");
const Transaction = require('./models/transaction.model');

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
app.post("/api/transaction", (req, res) => {
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

    // Process the transaction here
    // For example, save to MongoDB or perform other operations

    // Return success status code
    return res.status(200).json({
      success: true,
      message: "Transaction processed successfully",
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

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

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
        
        // Check if body is empty
        if (!body || body.trim() === '') {
          console.warn("[WEBHOOK] Empty payload received");
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ 
            success: false, 
            message: "Empty payload received" 
          }));
          return;
        }
        
        // Try to parse the JSON with additional error handling
        let paymentData;
        try {
          paymentData = JSON.parse(body);
        } catch (parseError) {
          console.error("[WEBHOOK] JSON parsing error:", parseError);
          console.error("[WEBHOOK] Raw payload:", body);
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({
            success: false,
            message: "Invalid JSON format",
            error: parseError.message
          }));
          return;
        }

        // Save transaction record
        const transaction = new Transaction({
          transactionId: paymentData.id || null,
          gateway: paymentData.gateway || "unknown",
          amount: paymentData.transferAmount || 0,
          content: paymentData.content || "",
          referenceCode: paymentData.referenceCode || null,
          status: "received",
          rawData: paymentData,
          requestIP: clientIP,
        });

        // Extract order reference if available
        if (paymentData.content) {
          const orderRefMatch = paymentData.content.match(
            /PointBoard-?([A-Z0-9]+)/i
          );
          if (orderRefMatch) {
            transaction.orderRef = orderRefMatch[1];
          }
        }

        await transaction.save();
        console.log("[WEBHOOK] Transaction saved:", transaction._id);

        // Return success response
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            success: true,
            message: "Payment notification received",
          })
        );
      } catch (error) {
        console.error("[WEBHOOK] Processing error:", error);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({ success: true, message: "Error processing webhook" })
        );
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
