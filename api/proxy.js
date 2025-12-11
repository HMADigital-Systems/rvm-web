import axios from 'axios';
import md5 from 'blueimp-md5';

export default async function handler(req, res) {
  // 1. Setup CORS Headers (Must be first!)
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*'); // Allow any origin
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // 2. Handle Preflight Request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // 3. Get Secrets
  // Note: Vercel reads these from the Dashboard Settings
  const SECRET = process.env.VITE_AUTOGCM_SECRET;
  const MERCHANT_NO = process.env.VITE_AUTOGCM_MERCHANT_NO;
  const API_BASE = "https://api.autogcm.com";

  // 4. Debugging: Check if secrets are loaded
  if (!SECRET || !MERCHANT_NO) {
    console.error("❌ CRITICAL: Environment variables missing on server!");
    res.status(500).json({ error: "Server Configuration Error: Missing Secrets" });
    return;
  }

  // 5. Prepare Data & Signature
  const { endpoint, method = 'GET', params = {}, body = {} } = req.body || req.query;
  const timestamp = Date.now().toString();
  
  // Signature Generation
  const sign = md5(MERCHANT_NO + SECRET + timestamp);

  const headers = {
    "merchant-no": MERCHANT_NO,
    "timestamp": timestamp,
    "sign": sign,
    "Content-Type": "application/json"
  };

  try {
    // 6. Forward Request to AutoGCM
    const response = await axios({
      url: `${API_BASE}${endpoint}`,
      method: method,
      headers: headers,
      params: params,
      data: body
    });

    res.status(200).json(response.data);
  } catch (error) {
    console.error("❌ Proxy Error:", error.message);
    res.status(500).json({ 
      error: error.message, 
      details: error.response?.data || "No external response"
    });
  }
}