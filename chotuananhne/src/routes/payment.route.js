const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/payment.controller");

// POST route for webhook - this should be fine
router.post("/webhook/sepay", paymentController.sePayWebhook);

// FIX THIS LINE - either:
// Option 1: Check if the function exists and is exported properly
router.get("/verify/:orderRef", paymentController.verifyPayment);

// Option 2: Replace with an inline function if verifyPayment doesn't exist
// router.get("/verify/:orderRef", (req, res) => {
//   res.status(200).json({
//     success: true,
//     verified: false,
//     message: "Verification endpoint under maintenance"
//   });
// });

// Transaction history (add auth later when middleware is fixed)
router.get("/transactions", paymentController.getTransactionHistory);

module.exports = router;