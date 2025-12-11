import axios from 'axios';
import crypto from 'crypto'; // ✅ Native Node.js library (No installation needed)

export default async function handler(req, res) {
  // 1. Force CORS Headers (The "Nuclear Option")
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*'); 
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // 2. Handle Options (Preflight)
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // 3. Get Secrets
  const SECRET = process.env.VITE_AUTOGCM_SECRET;
  const MERCHANT_NO = process.env.VITE_AUTOGCM_MERCHANT_NO;
  const API_BASE = "https://api.autogcm.com";

  // 4. Debugging: Check if secrets exist
  if (!SECRET) {
    console.error("❌ CRITICAL ERROR: VITE_AUTOGCM_SECRET is missing!");
    res.status(500).json({ error: "Server Secret Missing" });
    return;
  }

  // 5. Logic
  const { endpoint, method = 'GET', params = {}, body = {} } = req.body || req.query;
  const timestamp = Date.now().toString();

  // ✅ MD5 GENERATION (Using Native 'crypto' - No external dependency)
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
    console.log(`🚀 Proxying ${method} to: ${API_BASE}${endpoint}`); 
    
    const response = await axios({
      url: `${API_BASE}${endpoint}`,
      method: method,
      headers: headers,
      params: params,
      data: body
    });

    res.status(200).json(response.data);
  } catch (error) {
    console.error("❌ Upstream API Error:", error.message);
    // Return the specific error from AutoGCM if available
    res.status(500).json({ 
      error: error.message, 
      details: error.response?.data || "No external response" 
    });
  }
}