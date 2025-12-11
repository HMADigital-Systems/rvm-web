import axios from 'axios';
import crypto from 'crypto'; // ✅ Built-in Node.js library (No installation needed)

export default async function handler(req, res) {
  // 1. CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // 2. Get Secrets
  const SECRET = process.env.VITE_AUTOGCM_SECRET;
  const MERCHANT_NO = process.env.VITE_AUTOGCM_MERCHANT_NO;
  const API_BASE = "https://api.autogcm.com";

  if (!SECRET) {
    console.error("❌ Secrets missing!");
    res.status(500).json({ error: "Configuration Error" });
    return;
  }

  // 3. Prepare Data
  const { endpoint, method = 'GET', params = {}, body = {} } = req.body || req.query;
  const timestamp = Date.now().toString();

  // 4. Generate Signature using Native Crypto (More stable than blueimp-md5)
  // Logic: MD5(merchant + secret + timestamp)
  const sign = crypto
    .createHash('md5')
    .update(MERCHANT_NO + SECRET + timestamp)
    .digest('hex');

  const headers = {
    "merchant-no": MERCHANT_NO,
    "timestamp": timestamp,
    "sign": sign,
    "Content-Type": "application/json"
  };

  try {
    console.log(`🚀 Sending ${method} to ${API_BASE}${endpoint}`);
    const response = await axios({
      url: `${API_BASE}${endpoint}`,
      method: method,
      headers: headers,
      params: params,
      data: body
    });
    
    res.status(200).json(response.data);
  } catch (error) {
    console.error("❌ API Error:", error.message);
    res.status(500).json({ 
      error: error.message, 
      details: error.response?.data 
    });
  }
}