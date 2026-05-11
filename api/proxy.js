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

  // 3. Get Secrets
  const SECRET = process.env.VITE_AUTOGCM_SECRET || '99368df20fd10d5322f203435ddc9984';
  const MERCHANT_NO = process.env.VITE_AUTOGCM_MERCHANT_NO || '20250902924787';
  const API_BASE = process.env.VITE_AUTOGCM_URL || "https://api.autogcm.com"; 

  // 4. Critical Check (Kept this for safety, but it won't print unless it fails)
  if (!SECRET || !MERCHANT_NO) {
    console.error("❌ CRITICAL ERROR: Secrets are missing from Environment Variables!");
    res.status(500).json({ error: "Server Configuration Error" });
    return;
  }

  // 5. Logic
  const { endpoint, method = 'GET', params = {}, body = {} } = req.body || req.query;
  const timestamp = Date.now().toString();

  // ✅ MD5 GENERATION
  const sign = crypto
    .createHash('md5')
    .update(MERCHANT_NO + SECRET + timestamp)
    .digest('hex')
    .toUpperCase(); 

  const headers = {
    "merchant-no": MERCHANT_NO,
    "timestamp": timestamp,
    "sign": sign,
    "Content-Type": "application/json"
  };

  try {
    // 🚀 REMOVED: console.log(`🚀 Proxying ...`); (Clean Terminal)
    
    const response = await axios({
      url: `${API_BASE}${endpoint}`,
      method: method,
      headers: headers,
      params: params,
      data: body
    });

    res.status(200).json(response.data);
  } catch (error) {
    // ⚠️ Only log actual errors (So you know if the Chinese API is down)
    console.error(`❌ API Error [${endpoint}]:`, error.message);
    
    res.status(500).json({ 
      error: error.message, 
      details: error.response?.data || "No external response" 
    });
  }
}