import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
// 🟢 Get the Merchant No from config
const MERCHANT_NO_CONFIG = import.meta.env.VITE_AUTOGCM_MERCHANT_NO; 

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("⚠️ Supabase Keys missing in .env file!");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Cache to avoid repeated DB calls
let cachedMerchantId = null;

/**
 * 🔍 Helper: Get the Platform/Current Merchant UUID
 * This converts the '2025...' string into the Postgres UUID
 */
export async function getMerchantId() {
  if (cachedMerchantId) return cachedMerchantId;

  try {
    const { data, error } = await supabase
      .from('merchants')
      .select('id')
      .eq('merchant_no', MERCHANT_NO_CONFIG) 
      .maybeSingle();

    if (error) throw error;
    
    // Fallback: If not found, try to grab the first merchant (Safety for dev)
    if (!data) {
        console.warn(`Merchant No ${MERCHANT_NO_CONFIG} not found. Fetching default.`);
        const { data: defaultM } = await supabase.from('merchants').select('id').limit(1).single();
        if (defaultM) {
            cachedMerchantId = defaultM.id;
            return defaultM.id;
        }
        return null;
    }

    cachedMerchantId = data.id;
    return data.id;
  } catch (err) {
    console.error("Failed to fetch Merchant ID:", err);
    return null;
  }
}

/**
 * Helper: Get the Supabase User UUID
 */
export async function getOrCreateUser(phone, nickname = '', avatar = '') {
  try {
    // 1. Try to find user
    let { data, error } = await supabase
      .from('users')
      .select('id, lifetime_integral, total_weight') // 🟢 ADDED: total_weight
      .eq('phone', phone)
      .maybeSingle();

    // 2. If found, return ID
    if (data) return data;

    // 3. If not found, create them
    console.log("🆕 Creating new user entry in DB for:", phone);
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert([{ 
          phone: phone, 
          nickname: nickname || 'New User',
          avatar_url: avatar 
      }])
      .select('id, lifetime_integral, total_weight') // 🟢 ADDED: total_weight
      .single();

    if (createError) throw createError;
    return newUser;
  } catch (err) {
    console.error("User Sync Error:", err);
    return null;
  }
}