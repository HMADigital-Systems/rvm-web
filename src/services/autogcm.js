import axios from "axios";

// If running locally, point to local Vercel; if prod, point to real URL
const PROXY_URL = import.meta.env.DEV 
  ? '/api/proxy' 
  : '/api/proxy'; 

// Generic Wrapper
async function callApi(endpoint, method = 'GET', data = {}) {
  try {
    const payload = {
      endpoint,
      method,
      [method === 'GET' ? 'params' : 'body']: data
    };
    
    // We send a POST to our proxy regardless of the final method
    // The proxy handles the real switching.
    const res = await axios.post(PROXY_URL, payload);
    return res.data; 
  } catch (error) {
    console.error(`❌ API Error [${endpoint}]:`, error.message);
    throw error;
  }
} 

// ✅ 1. Register / Sync User
export async function syncUser(phone, nickname = "", avatarUrl = "") {
  // Doc: 12 注册用户(信息同步)
  return await callApi('/api/open/v1/user/account/sync', 'POST', {
    phone,
    nikeName: nickname, // Note: API uses 'nikeName' typo as per doc
    avatarUrl
  });
}

// ✅ 2. Get User Records
export async function getUserRecords(phone, pageNum = 1, pageSize = 10) {
  // Doc: 4 查询垃圾投放记录
  return await callApi('/api/open/v1/put', 'GET', {
    phone,
    pageNum,
    pageSize
  });
}

// ✅ 3. Get Nearby RVMs
export async function getNearbyRVMs(latitude, longitude) {
  // Doc: 10 获取附近的设备
  return await callApi('/api/open/video/v2/nearby', 'GET', {
    latitude,
    longitude
  });
}

// ✅ 4. Get Machine Config (Compartments)
export async function getMachineConfig(deviceNo) {
  // Doc: 2 获取仓位配置
  return await callApi('/api/open/v1/device/position', 'GET', {
    deviceNo
  });
}

// ✅ 5. Open Rubbish Port (NEW - Added based on PDF)
export async function openRubbishPort(deviceNo, phone, positionNo) {
  // Doc: 3 选择开启垃圾投口
  return await callApi('/api/open/v1/open', 'POST', {
    deviceNo,
    phone,
    positionNo: parseInt(positionNo) // Ensure int
  });
}

// ✅ 6. Bind Card (NEW - Added based on PDF)
export async function bindCard(deviceNo, phone) {
  // Doc: 11 二维码授权绑卡
  return await callApi('/api/open/v1/code/auth/bindCard', 'GET', {
    deviceNo,
    phone
  });
}