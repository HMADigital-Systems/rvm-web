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
    if (error) throw error;
    return data || null;
  } catch (err) {
    console.error("getUserByEmail Error:", err);
    return null;
  }
}

/**
 * Look up user by phone number (normalized automatically)
 */
export async function getUserByPhone(phone) {
  if (!phone) return null;
  try {
    const normalized = normalizePhone(phone);
    const { data, error } = await supabase.rpc('get_user_by_phone', {
      check_phone: normalized
    });
    if (error) throw error;
    return data || null;
  } catch (err) {
    console.error("getUserByPhone Error:", err);
    return null;
  }
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
    if (error) throw error;
    return data || null;
  } catch (err) {
    console.error("upsertUserByEmail Error:", err);
    throw err;
  }
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
  try {
    const normalized = normalizePhone(phone);
    const { data, error } = await supabase.rpc('upsert_user_by_phone', {
      p_phone: normalized,
      p_nickname: nickname || 'New User',
      p_avatar_url: avatar,
      p_email: email
    });
    if (error) throw error;
    return data; 
  } catch (err) {
    console.error("User Sync Error:", err);
    return null;
  }
}
