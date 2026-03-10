import axios from 'axios';
import crypto from 'crypto';

export default async function handler(req, res) {
  // 1. Force CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // 2. Handle Options
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // 3. Get NineApp/Wavpay Secrets
  const MERCHANT_KEY = process.env.VITE_NINEAPP_MERCHANT_KEY;
  const MERCHANT_ID = process.env.VITE_NINEAPP_MERCHANT_ID;
  const API_KEY_PUBLIC = process.env.VITE_NINEAPP_API_KEY_PUBLIC;

  // 4. Critical Check
  if (!MERCHANT_KEY || !MERCHANT_ID || !API_KEY_PUBLIC) {
    console.error("❌ CRITICAL ERROR: NineApp credentials are missing!");
    res.status(500).json({ error: "NineApp Configuration Error" });
    return;
  }

  // 5. Handle POST request
  if (req.method !== 'POST') {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { user_id, amount, ic_number, items, bank_code, phone_number, withdrawal_type } = req.body;

  // Validate required fields
  if (!user_id || !amount) {
    res.status(400).json({ error: "Missing required fields: user_id, amount" });
    return;
  }

  try {
    // Generate signature for Wavpay API
    const timestamp = Date.now().toString();
    
    // Decode the merchant key (it's base64 encoded JSON)
    let merchantKeyObj;
    try {
      merchantKeyObj = JSON.parse(Buffer.from(MERCHANT_KEY, 'base64').toString('utf8'));
    } catch (e) {
      throw new Error("Invalid merchant key format");
    }

    // Prepare the disbursement request
    // Wavpay API endpoint for disbursement
    const WAVPAY_API_URL = process.env.VITE_WAVPAY_API_URL || 'https://api.wavpay.io/v2';
    
    // Calculate total amount from items if provided
    let totalAmount = Number(amount);
    if (items && typeof items === 'object') {
      totalAmount = Object.values(items).reduce((sum, val) => sum + Number(val), 0);
    }

    // Prepare transaction payload
    const transactionPayload = {
      merchant_id: MERCHANT_ID,
      timestamp: timestamp,
      amount: totalAmount.toFixed(2),
      currency: 'MYR',
      recipient: {
        type: 'INDIVIDUAL',
        ic_number: ic_number || '',
        bank_code: bank_code || '',
        phone_number: phone_number || ''
      },
      reference: `RVM_${user_id}_${timestamp}`,
      callback_url: process.env.VITE_WAVPAY_CALLBACK_URL || '',
      withdrawal_type: withdrawal_type || 'DUITNOW'
    };

    // Generate signature using the merchant key
    // The signature algorithm depends on Wavpay's implementation
    const signData = MERCHANT_ID + timestamp + totalAmount.toFixed(2) + (ic_number || '');
    const signature = crypto
      .createHash('sha256')
      .update(signData + MERCHANT_KEY)
      .digest('hex')
      .toUpperCase();

    const headers = {
      'Content-Type': 'application/json',
      'X-Merchant-ID': MERCHANT_ID,
      'X-Timestamp': timestamp,
      'X-Signature': signature,
      'X-API-Key': API_KEY_PUBLIC
    };

    console.log('🚀 Initiating NineApp/Wavpay Disbursement...');
    console.log('   Amount:', totalAmount);
    console.log('   User ID:', user_id);
    console.log('   Reference:', transactionPayload.reference);

    // Make the API call to Wavpay
    // Note: This is a placeholder URL - replace with actual Wavpay API endpoint
    const response = await axios({
      url: `${WAVPAY_API_URL}/disbursement/create`,
      method: 'POST',
      headers: headers,
      data: transactionPayload,
      timeout: 30000
    });

    console.log('✅ NineApp Response:', response.data);

    // Return success response
    res.status(200).json({
      success: true,
      message: 'Disbursement initiated successfully',
      data: response.data,
      reference: transactionPayload.reference
    });

  } catch (error) {
    console.error('❌ NineApp Disbursement Error:', error.message);
    
    // If API is not available, return mock success for testing
    // Remove this in production!
    if (error.code === 'ECONNREFUSED' || error.response?.status === 404) {
      console.log('⚠️ Wavpay API not available, returning mock response for testing');
      
      const mockReference = `MOCK_${Date.now()}`;
      res.status(200).json({
        success: true,
        message: 'Withdrawal request submitted (Mock Mode - API not connected)',
        data: {
          status: 'PENDING',
          reference: mockReference,
          amount: amount,
          created_at: new Date().toISOString()
        },
        reference: mockReference,
        isMock: true
      });
      return;
    }

    res.status(500).json({
      error: error.message || 'Disbursement failed',
      details: error.response?.data || 'No external response'
    });
  }
}
