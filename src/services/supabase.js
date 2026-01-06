import { createClient } from '@supabase/supabase-js';

// Get these from your Supabase Dashboard -> Settings -> API
// Ensure these match your Backend Admin project exactly!
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("⚠️ Supabase Keys missing in .env file!");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Crucial Helper: Get the Supabase User UUID based on Phone Number.
 * If the user doesn't exist in DB yet, create them immediately.
 */
export async function getOrCreateUser(phone, nickname = '', avatar = '') {
  try {
    // 1. Try to find user
    let { data, error } = await supabase
      .from('users')
      .select('id, lifetime_integral')
      .eq('phone', phone)
      .maybeSingle();

    // 2. If found, return ID
    if (data) return data;

    // 3. If not found, create them (Sync Logic)
    console.log("🆕 Creating new user entry in DB for:", phone);
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert([
        { 
            phone: phone, 
            nickname: nickname || 'New User',
            avatar_url: avatar 
        }
      ])
      .select('id, lifetime_integral')
      .single();

    if (createError) throw createError;
    return newUser;
  } catch (err) {
    console.error("User Sync Error:", err);
    return null;
  }
}