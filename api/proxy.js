import axios from 'axios';
import md5 from 'blueimp-md5';

export default async function handler(req, res) {
  // 1. Get Secrets from Environment Variables (set these in Vercel Dashboard)
  const SECRET = process.env.VITE_AUTOGCM_SECRET;
  const MERCHANT_NO = process.env.VITE_AUTOGCM_MERCHANT_NO;
  const API_BASE = "https://api.autogcm.com";

  // 2. Handle CORS (Allow your frontend to call this)
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*'); 
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');

  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // 3. Prepare Data from the Frontend Request
  const { endpoint, method = 'GET', params = {}, body = {} } = req.body || req.query;

  // 4. Generate Signature (The secure part!)
  const timestamp = Date.now().toString();
  const sign = md5(MERCHANT_NO + SECRET + timestamp);
  
  const headers = {
    "merchant-no": MERCHANT_NO,
    "timestamp": timestamp,
    "sign": sign,
    "Content-Type": "application/json"
  };

  try {
    // 5. Forward the request to AutoGCM
    const response = await axios({
      url: `${API_BASE}${endpoint}`,
      method: method,
      headers: headers,
      params: params,
      data: body
    });

    // 6. Return data to Frontend
    res.status(200).json(response.data);
  } catch (error) {
    res.status(500).json({ 
      error: error.message, 
      details: error.response?.data 
    });
  }
}