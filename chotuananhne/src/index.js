require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const mongoose = require("mongoose");
const http = require("http");

const app = express();
const PORT = process.env.PORT || 3000;

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
        const paymentData = JSON.parse(body);

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
// Start your Express app as usual
const server = app.listen(PORT, () => {
  console.log(`[APP] Main server running on port ${PORT}`);
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
