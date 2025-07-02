import { MongoClient } from 'mongodb';

// Connection string from environment variable
const uri = process.env.MONGODB_URI;

export default async function handler(req, res) {
  // Set CORS headers directly in the handler too for extra safety
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle OPTIONS preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Only allow POST method for actual processing
  if (req.method !== 'POST') {
    return res.status(200).json({
      success: true,
      message: 'Only POST method accepted'
    });
  }

  console.log('Webhook received from:', req.headers['x-forwarded-for'] || req.connection.remoteAddress);

  try {
    // Always log the request for debugging
    console.log('Webhook payload:', JSON.stringify(req.body));

    // Connect to MongoDB
    const client = new MongoClient(uri);
    await client.connect();
    const database = client.db('your_database_name'); // Replace with your DB name
    
    // Save transaction record only
    const transactions = database.collection('transactions');
    const payload = req.body;
    
    // Extract order number for logging purposes
    let orderNumber = null;
    if (payload.content) {
      // Match POINTBOARD format: POINTBOARDA247872
      const match = payload.content.match(/POINTBOARD([A-Z][0-9]{6})/i);
      if (match) {
        orderNumber = `POINTBOARD${match[1]}`; // Include full POINTBOARD prefix
      }
    }
    
    // Store transaction record
    await transactions.insertOne({
      transactionId: payload.id,
      orderNumber: orderNumber,
      gateway: payload.gateway,
      amount: payload.transferAmount,
      content: payload.content,
      referenceCode: payload.referenceCode,
      timestamp: new Date(),
      rawData: payload
    });
    
    console.log(`📝 Transaction saved for orderNumber: ${orderNumber || 'N/A'}`);
    console.log('ℹ️  Note: Order will NOT be created/updated automatically. Use /api/orders/create-from-ref endpoint.');
    
    await client.close();
    
    // Always return success
    return res.status(200).json({
      success: true,
      message: 'Payment notification received and transaction saved'
    });
  } catch (error) {
    console.error('Webhook processing error:', error);
    
    // Even on error, return success to SePay
    return res.status(200).json({
      success: true,
      message: 'Error processing webhook, but request received'
    });
  }
}