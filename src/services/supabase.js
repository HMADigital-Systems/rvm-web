import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("⚠️ Supabase Keys missing in .env file!");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let cachedPlatformId = null;

export async function getMerchantId() {
  if (cachedPlatformId) return cachedPlatformId;

  try {
    // 1. Try to find the dedicated Platform Merchant
    let { data } = await supabase
      .from('merchants')
      .select('id')
      .eq('name', 'RVM Platform') 
      .maybeSingle();

    // 2. Fallback: Use 'Demo Shop' if Platform doesn't exist
    if (!data) {
        const { data: demo } = await supabase
            .from('merchants')
            .select('id')
            .eq('name', 'Demo Shop')
            .maybeSingle();
        data = demo;
    }

    // 3. Emergency: Just take the first one found
    if (!data) {
        const { data: first } = await supabase.from('merchants').select('id').limit(1).single();
        data = first;
    }

    if (data) {
        cachedPlatformId = data.id;
        return data.id;
    }
    return null;
  } catch (err) {
    console.error("Failed to fetch Platform ID:", err);
    return null;
  }
}

export async function getOrCreateUser(phone, nickname = '', avatar = '') {
  try {
    let { data, error } = await supabase
      .from('users')
      .select('id, lifetime_integral, total_weight') // ✅ Keeps Home Page Weight working
      .eq('phone', phone)
      .maybeSingle();

    if (data) return data;

    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert([{ 
          phone: phone, 
          nickname: nickname || 'New User',
          avatar_url: avatar 
      }])
      .select('id, lifetime_integral, total_weight')
      .single();

    if (createError) throw createError;
    return newUser;
  } catch (err) {
    console.error("User Sync Error:", err);
    return null;
  }
}