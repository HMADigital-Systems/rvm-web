import { createClient } from '@supabase/supabase-js';
import { normalizePhone } from '../utils/phone-utils.js';

// Use VITE env vars if available (Vercel build), fallback to hardcoded defaults
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://aultuckuvussdyynglkj.supabase.co";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_S9EulCL4BbZfmJft6Ly90g_03fxAe6u";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let cachedPlatformId = null;

export async function getMerchantId() {
  if (cachedPlatformId) return cachedPlatformId;

  try {
    const { data, error } = await supabase.rpc('get_platform_id');
    if (error) throw error;
    if (data) {
        cachedPlatformId = data;
        return data;
    }
    return null;
  } catch (err) {
    console.error("Failed to fetch Platform ID:", err);
    return null;
  }
}

// ===========================================
// NEW: Email-first functions
// ===========================================

/**
 * Look up user by email (authoritative primary UID)
 */
export async function getUserByEmail(email) {
  if (!email) return null;
  try {
    const { data, error } = await supabase.rpc('get_user_by_email', {
      check_email: email
    });
    if (!error && data) return Array.isArray(data) ? data[0] : data;
    console.warn("getUserByEmail RPC error:", error?.message);
  } catch (err) {
    console.warn("getUserByEmail error:", err.message);
  }
  
  // FALLBACK: Direct table query
  try {
    const { data, error: qErr } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    if (!qErr && data) return data;
  } catch (e) {}
  
  return null;
}

/**
 * Look up user by phone number (normalized automatically)
 */
export async function getUserByPhone(phone) {
  if (!phone) return null;
  
  const phoneFormats = [
    phone,
    normalizePhone(phone),
    String(phone).replace(/[^0-9]/g, ''),
  ].filter((v, i, a) => v && a.indexOf(v) === i);
  
  for (const variant of phoneFormats) {
    try {
      const { data, error } = await supabase.rpc('get_user_by_phone', {
        check_phone: variant
      });
      
      if (!error && data) {
        const user = Array.isArray(data) ? data[0] : data;
        if (user && user.id) return user;
      }
    } catch (e) { /* try next */ }
  }
  
  // FALLBACK: Direct table query with multiple formats
  for (const variant of phoneFormats) {
    try {
      const { data, error: qErr } = await supabase
        .from('users')
        .select('*')
        .eq('phone', variant)
        .single();
      
      if (!qErr && data) return data;
    } catch (e) { /* try next */ }
  }
  
  console.error("getUserByPhone: all methods failed");
  return null;
}

/**
 * PRIMARY UPSERT: Email is the key.
 * If email exists → updates phone & profile
 * If email not found by email but phone exists → links email to that phone record
 * If neither exists → creates new record
 */
export async function upsertUserByEmail(email, { phone, nickname, avatarUrl, fullName } = {}) {
  if (!email) throw new Error("Email is required for upsertUserByEmail");
  
  try {
    const normalizedPhone = phone ? normalizePhone(phone) : '';
    const { data, error } = await supabase.rpc('upsert_user_by_email', {
      p_email: email,
      p_phone: normalizedPhone || '',
      p_nickname: nickname || '',
      p_avatar_url: avatarUrl || '',
      p_full_name: fullName || ''
    });
    if (!error && data) {
      const user = Array.isArray(data) ? data[0] : data;
      if (user && user.id) return user;
    }
    console.warn("upsertUserByEmail RPC error:", error?.message);
  } catch (err) {
    console.warn("upsertUserByEmail RPC error:", err.message);
  }
  
  return null;
}

/**
 * Check if email exists with a DIFFERENT phone number
 * Returns: existing_phone string if conflict, null if no conflict
 */
export async function checkEmailPhoneConflict(email, phone) {
  if (!email || !phone) return null;
  try {
    const normalized = normalizePhone(phone);
    const { data, error } = await supabase.rpc('check_email_phone_conflict', {
      p_email: email,
      p_phone: normalized
    });
    if (error) throw error;
    return data || null;
  } catch (err) {
    console.error("checkEmailPhoneConflict Error:", err);
    return null;
  }
}

// ===========================================
// LEGACY: Phone-first functions (backward compat)
// ===========================================

/**
 * Legacy getOrCreateUser — uses phone as key
 * Now delegates internally via the improved upsert_user_by_phone RPC
 */
export async function getOrCreateUser(phone, nickname = '', avatar = '', email = null) {
  // Try multiple phone formats: raw, normalized, stripped of +60
  const phoneFormats = [
    phone,                                    // raw: 0126258882
    normalizePhone(phone),                    // normalized: 60126258882
    String(phone).replace(/[^0-9]/g, ''),     // digits only: 0126258882
  ].filter((v, i, a) => v && a.indexOf(v) === i); // deduplicate
  
  let lastError = null;
  
  for (const variant of phoneFormats) {
    try {
      const { data, error } = await supabase.rpc('upsert_user_by_phone', {
        p_phone: variant,
        p_nickname: nickname || 'New User',
        p_avatar_url: avatar,
        p_email: email
      });
      
      if (!error && data) {
        const user = Array.isArray(data) ? data[0] : data;
        // Only accept if we got real user data (not a new empty insert)
        if (user && user.id) return user;
      }
      lastError = error;
    } catch (err) {
      lastError = err;
    }
  }
  
  console.warn("RPC failed with all phone formats, falling back:", lastError?.message);
  
  // FALLBACK: Try direct table query with multiple formats
  for (const variant of phoneFormats) {
    try {
      const { data: user, error: qErr } = await supabase
        .from('users')
        .select('*')
        .eq('phone', variant)
        .single();
      
      if (!qErr && user) return user;
    } catch (e) {
      // try next format
    }
  }
  
  console.error("All user lookup methods failed for all phone formats");
  return null;
}
