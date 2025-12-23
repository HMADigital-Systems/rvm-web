import axios from "axios";

// 🟢 VITE PROXY: Points to relative path so vite.config.js handles the forwarding
const PROXY_URL = '/api/proxy';

// Generic Wrapper
async function callApi(endpoint, method = 'GET', data = {}) {
  try {
    const payload = {
      endpoint,
      method,
      [method === 'GET' ? 'params' : 'body']: data
    };
    
    const res = await axios.post(PROXY_URL, payload);
    return res.data; 
  } catch (error) {
    console.error(`❌ API Error [${endpoint}]:`, error.message);
    throw error;
  }
} 

// ✅ 1. Register / Sync User
export async function syncUser(phone, nickname = "", avatarUrl = "") {
  
  // 🟢 REVERTED: Send phone exactly as provided (e.g. "0149607561")
  console.log(`📡 Syncing User: "${phone}"`);

  return await callApi('/api/open/v1/user/account/sync', 'POST', {
    phone: phone,
    nikeName: nickname, // API typo 'nikeName' is required
    avatarUrl
  });
}

// Alias for registration flow
export async function registerUserWithAutoGCM(token, phone, nickname = "", avatarUrl = "") {
  return await syncUser(phone, nickname, avatarUrl);
}

// ✅ 2. Get User Records
export async function getUserRecords(phone, pageNum = 1, pageSize = 10) {
  return await callApi('/api/open/v1/put', 'GET', {
    phone: phone,
    pageNum,
    pageSize
  });
}

// ✅ 3. Get Nearby RVMs
export async function getNearbyRVMs(latitude, longitude) {
  return await callApi('/api/open/video/v2/nearby', 'GET', {
    latitude,
    longitude
  });
}

// ✅ 4. Get Machine Config
export async function getMachineConfig(deviceNo) {
  return await callApi('/api/open/v1/device/position', 'GET', {
    deviceNo
  });
}

// ✅ 5. Open Rubbish Port
export async function openRubbishPort(deviceNo, phone, positionNo) {
  return await callApi('/api/open/v1/open', 'POST', {
    deviceNo,
    phone: phone,
    positionNo: parseInt(positionNo)
  });
}

// ✅ 6. Bind Card
export async function bindCard(deviceNo, phone) {
  return await callApi('/api/open/v1/code/auth/bindCard', 'GET', {
    deviceNo,
    phone: phone
  });
} 

  // ✅ 7. Update User Profile (Nickname & Avatar)
// Uses the same 'sync' endpoint. We just send the same phone with NEW data.
export async function updateUserProfile(phone, newNickname, newAvatarUrl) {
  // Ensure we don't accidentally wipe data if one field is empty
  if (!phone) throw new Error("Phone number is required for update");
  
  return await callApi('/api/open/v1/user/account/sync', 'POST', {
    phone: phone, // The key to identify the user
    nikeName: newNickname, 
    avatarUrl: newAvatarUrl
  });
}

// ✅ 8. Get Public Machine Records (For Global Dashboard)
// Queries the recycling history of a specific machine, not a specific user.
export async function getMachinePublicRecords(deviceNo, pageNum = 1, pageSize = 20) {
  return await callApi('/api/open/v1/put', 'GET', {
    deviceNo: deviceNo, // Filter by Machine
    pageNum,
    pageSize
    // Note: We deliberately omit 'phone' to get ALL users' data for this machine
  });
}

// ✅ 9. Get User Stats (Calculated)
// Fetches user history and calculates totals (API doesn't give totals directly)
export async function getUserStats(phone) {
  try {
    // Fetch last 100 records (limit to avoid heavy load)
    const res = await getUserRecords(phone, 1, 100);
    
    if (res.code === 200 && res.data && res.data.list) {
      const records = res.data.list;
      
      // Calculate Totals
      const totalWeight = records.reduce((sum, item) => sum + (item.weight || 0), 0);
      const totalPoints = records.reduce((sum, item) => sum + (item.integral || 0), 0);
      const totalItems = records.length;
      
      return {
        totalWeight: totalWeight.toFixed(2),
        totalPoints: totalPoints.toFixed(2),
        totalItems,
        recentHistory: records.slice(0, 5) // Top 5 recent items
      };
    }
    return { totalWeight: 0, totalPoints: 0, totalItems: 0, recentHistory: [] };
  } catch (err) {
    console.error("Failed to calculate stats:", err);
    return null;
  }
}
