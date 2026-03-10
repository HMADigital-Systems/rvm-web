// Simple local development server for API proxy
import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3000;

// Get credentials from environment
const SECRET = process.env.VITE_AUTOGCM_SECRET || '99368df20fd10d5322f203435ddc9984';
const MERCHANT_NO = process.env.VITE_AUTOGCM_MERCHANT_NO || '20250902924787';
const API_BASE = process.env.VITE_AUTOGCM_URL || 'https://api.autogcm.com';

// NineApp/Wavpay credentials
const NINEAPP_MERCHANT_KEY = process.env.VITE_NINEAPP_MERCHANT_KEY;
const NINEAPP_MERCHANT_ID = process.env.VITE_NINEAPP_MERCHANT_ID;
const NINEAPP_API_KEY_PUBLIC = process.env.VITE_NINEAPP_API_KEY_PUBLIC;
const WAVPAY_API_URL = process.env.VITE_WAVPAY_API_URL || 'https://api.wavpay.io/v2';
const WAVPAY_SECRET_KEY = process.env.VITE_WAVPAY_SECRET_KEY;
const WAVPAY_PUBLIC_KEY = process.env.VITE_WAVPAY_PUBLIC_KEY;
const WAVPAY_PGP_PRIVATE_KEY = process.env.VITE_WAVPAY_PGP_PRIVATE_KEY;
const WAVPAY_CALLBACK_URL = process.env.VITE_WAVPAY_CALLBACK_URL;
const WAVPAY_PARTNER_ID = process.env.VITE_WAVPAY_PARTNER_ID;

console.log('🔧 Local API Server starting...');
console.log('   Merchant No:', MERCHANT_NO);

// Generate MD5 signature
function generateSign(timestamp) {
  return crypto
    .createHash('md5')
    .update(MERCHANT_NO + SECRET + timestamp)
    .digest('hex')
    .toUpperCase();
}

// Proxy endpoint
app.post('/api/proxy', async (req, res) => {
  const { endpoint, method = 'GET', params = {}, body = {} } = req.body || req.query;
  const timestamp = Date.now().toString();
  const sign = generateSign(timestamp);

  const headers = {
    'merchant-no': MERCHANT_NO,
    'timestamp': timestamp,
    'sign': sign,
    'Content-Type': 'application/json'
  };

  try {
    console.log(`🚀 Proxying ${method} ${endpoint} with params:`, params, 'body:', body);
    console.log(`   Headers - merchant-no: ${MERCHANT_NO}, timestamp: ${timestamp}, sign: ${sign}`);
    
    const response = await axios({
      url: `${API_BASE}${endpoint}`,
      method: method,
      headers: headers,
      params: params,
      data: body
    });

    console.log(`✅ API Response [${endpoint}]:`, response.data);
    res.status(200).json(response.data);
  } catch (error) {
    console.error(`❌ API Error [${endpoint}]:`, error.message);
    console.error(`   Status:`, error.response?.status);
    console.error(`   Status Text:`, error.response?.statusText);
    console.error(`   Response data:`, error.response?.data);
    res.status(500).json({ 
      error: error.message, 
      details: error.response?.data || 'No external response',
      status: error.response?.status
    });
  }
});

// NineApp/Wavpay Disbursement Endpoint
app.post('/api/nineapp-disburse', async (req, res) => {
  const { user_id, amount, ic_number, items, bank_code, phone_number, withdrawal_type } = req.body;

  // Validate required fields
  if (!user_id || !amount) {
    res.status(400).json({ error: "Missing required fields: user_id, amount" });
    return;
  }

  if (!NINEAPP_MERCHANT_KEY || !NINEAPP_MERCHANT_ID || !NINEAPP_API_KEY_PUBLIC || !WAVPAY_SECRET_KEY) {
    console.error("❌ CRITICAL ERROR: NineApp/Wavpay credentials are missing!");
    console.error("   MERCHANT_KEY:", !!NINEAPP_MERCHANT_KEY);
    console.error("   MERCHANT_ID:", !!NINEAPP_MERCHANT_ID);
    console.error("   API_KEY_PUBLIC:", !!NINEAPP_API_KEY_PUBLIC);
    console.error("   SECRET_KEY:", !!WAVPAY_SECRET_KEY);
    res.status(500).json({ error: "NineApp/Wavpay Configuration Error" });
    return;
  }

  try {
    // Generate timestamp and signature
    const timestamp = Date.now().toString();
    
    // Calculate total amount from items if provided
    let totalAmount = Number(amount);
    if (items && typeof items === 'object') {
      totalAmount = Object.values(items).reduce((sum, val) => sum + Number(val), 0);
    }

    // Prepare transaction payload
    const transactionPayload = {
      partner_id: WAVPAY_PARTNER_ID || NINEAPP_MERCHANT_ID,
      merchant_id: NINEAPP_MERCHANT_ID,
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
      callback_url: WAVPAY_CALLBACK_URL || '',
      withdrawal_type: withdrawal_type || 'DUITNOW'
    };

    // Generate signature using SHA256 with merchant key
    const signData = MERCHANT_NO + timestamp + totalAmount.toFixed(2) + (ic_number || '');
    const signature = crypto
      .createHash('sha256')
      .update(signData + WAVPAY_SECRET_KEY)
      .digest('hex')
      .toUpperCase();

    const headers = {
      'Content-Type': 'application/json',
      'X-Merchant-ID': NINEAPP_MERCHANT_ID,
      'X-Timestamp': timestamp,
      'X-Signature': signature,
      'X-API-Key': NINEAPP_API_KEY_PUBLIC,
      'X-Public-Key': WAVPAY_PUBLIC_KEY || ''
    };

    console.log('🚀 Initiating NineApp/Wavpay Disbursement...');
    console.log('   Amount:', totalAmount);
    console.log('   User ID:', user_id);
    console.log('   Reference:', transactionPayload.reference);

    // Make the API call to Wavpay
    const response = await axios({
      url: `${WAVPAY_API_URL}/disbursement/create`,
      method: 'POST',
      headers: headers,
      data: transactionPayload,
      timeout: 30000
    });

    console.log('✅ NineApp Response:', response.data);

    res.status(200).json({
      success: true,
      message: 'Disbursement initiated successfully',
      data: response.data,
      reference: transactionPayload.reference
    });

  } catch (error) {
    console.error('❌ NineApp Disbursement Error:', error.message);
    
    // If API is not available, return mock success for testing
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
});

app.listen(PORT, () => {
  console.log(`✅ Local API server running at http://localhost:${PORT}`);
  console.log(`   Proxy endpoint: http://localhost:${PORT}/api/proxy`);
});
