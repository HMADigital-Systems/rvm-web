-- ===========================================
-- Email as Primary Unique Identifier (UID)
-- Run this in Supabase SQL Editor
-- ===========================================

-- ===========================================
-- 1. Clean empty/null emails
-- ===========================================
-- Convert empty string emails to NULL (they won't conflict in unique constraint)
UPDATE public.users SET email = NULL WHERE email = '';

-- ===========================================
-- 2. Clean duplicate non-empty emails
-- ===========================================
-- Remove duplicate email records keeping only the first one by created_at
DELETE FROM public.users a USING (
  SELECT MIN(ctid) as ctid, email
  FROM public.users
  WHERE email IS NOT NULL
  GROUP BY email
  HAVING COUNT(*) > 1
) b
WHERE a.email = b.email AND a.email IS NOT NULL
  AND a.ctid <> b.ctid;

-- ===========================================
-- 3. Add unique constraint on email
-- ===========================================
-- Nulls are treated as distinct in PostgreSQL, so no conflict from NULL values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'users_email_key' AND conrelid = 'public.users'::regclass
  ) THEN
    ALTER TABLE public.users ADD CONSTRAINT users_email_key UNIQUE (email);
  END IF;
END $$;

-- Also add unique on phone for consistency
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'users_phone_key' AND conrelid = 'public.users'::regclass
  ) THEN
    -- Only add phone unique if no duplicates exist
    IF NOT EXISTS (
      SELECT phone FROM public.users 
      WHERE phone IS NOT NULL AND phone != ''
      GROUP BY phone HAVING COUNT(*) > 1
      LIMIT 1
    ) THEN
      ALTER TABLE public.users ADD CONSTRAINT users_phone_key UNIQUE (phone);
    END IF;
  END IF;
END $$;

-- ===========================================
-- 4. Drop old functions that changed return types
-- (PostgreSQL requires DROP before CREATE when OUT params change)
-- ===========================================
DROP FUNCTION IF EXISTS public.get_user_by_email(check_email TEXT);
DROP FUNCTION IF EXISTS public.get_user_by_phone(check_phone TEXT);

-- ===========================================
-- 5. Create/Replace: get_user_by_email
-- Returns full user record by email
-- ===========================================
CREATE OR REPLACE FUNCTION public.get_user_by_email(check_email TEXT)
RETURNS TABLE(
  id UUID,
  user_id TEXT,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  nickname TEXT,
  avatar_url TEXT,
  vendor_user_no TEXT,
  total_weight NUMERIC,
  total_points NUMERIC,
  status VARCHAR,
  last_active_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.user_id,
    u.full_name,
    u.email,
    u.phone,
    u.nickname,
    u.avatar_url,
    u.vendor_user_no,
    u.total_weight,
    u.total_points,
    u.status,
    u.last_active_at,
    u.created_at
  FROM public.users u
  WHERE u.email = check_email
  LIMIT 1;
END;
$$;

-- ===========================================
-- 6. Create/Replace: get_user_by_phone
-- Returns full user record by phone
-- ===========================================
CREATE OR REPLACE FUNCTION public.get_user_by_phone(check_phone TEXT)
RETURNS TABLE(
  id UUID,
  user_id TEXT,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  nickname TEXT,
  avatar_url TEXT,
  vendor_user_no TEXT,
  total_weight NUMERIC,
  total_points NUMERIC,
  status VARCHAR,
  last_active_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.user_id,
    u.full_name,
    u.email,
    u.phone,
    u.nickname,
    u.avatar_url,
    u.vendor_user_no,
    u.total_weight,
    u.total_points,
    u.status,
    u.last_active_at,
    u.created_at
  FROM public.users u
  WHERE u.phone = check_phone
  LIMIT 1;
END;
$$;

-- ===========================================
-- 7. Create/Replace: upsert_user_by_email
-- PRIMARY RPC: Email is the unique key
-- If email exists → UPDATE (including phone)
-- If email not found by email → try phone → if phone exists, link to email
-- If neither exists → INSERT new record
-- ===========================================
CREATE OR REPLACE FUNCTION public.upsert_user_by_email(
  p_email TEXT,
  p_phone TEXT DEFAULT NULL,
  p_nickname TEXT DEFAULT '',
  p_avatar_url TEXT DEFAULT '',
  p_full_name TEXT DEFAULT ''
)
RETURNS TABLE(
  id UUID,
  user_id TEXT,
  email TEXT,
  phone TEXT,
  nickname TEXT,
  avatar_url TEXT,
  vendor_user_no TEXT,
  total_weight NUMERIC,
  total_points NUMERIC,
  status VARCHAR,
  is_new BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  existing_by_email RECORD;
  existing_by_phone RECORD;
  result_id UUID;
  result_user_id TEXT;
  result_is_new BOOLEAN;
BEGIN
  -- Step 1: Try to find by email first (authoritative)
  SELECT * INTO existing_by_email FROM public.users 
  WHERE email = p_email 
  LIMIT 1;

  -- Step 2: If email found, UPDATE phone if provided
  IF existing_by_email.id IS NOT NULL THEN
    UPDATE public.users SET
      phone = COALESCE(NULLIF(p_phone, ''), existing_by_email.phone),
      nickname = COALESCE(NULLIF(p_nickname, ''), existing_by_email.nickname),
      avatar_url = COALESCE(NULLIF(p_avatar_url, ''), existing_by_email.avatar_url),
      full_name = COALESCE(NULLIF(p_full_name, ''), existing_by_email.full_name),
      updated_at = NOW()
    WHERE id = existing_by_email.id;

    result_id := existing_by_email.id;
    result_user_id := existing_by_email.user_id;
    result_is_new := false;
  
  -- Step 3: Email not found — try by phone
  ELSIF p_phone IS NOT NULL AND p_phone != '' THEN
    SELECT * INTO existing_by_phone FROM public.users 
    WHERE phone = p_phone 
    LIMIT 1;

    -- Phone found → LINK email to this existing record
    IF existing_by_phone.id IS NOT NULL THEN
      UPDATE public.users SET
        email = p_email,
        nickname = CASE WHEN p_nickname != '' THEN p_nickname ELSE existing_by_phone.nickname END,
        avatar_url = CASE WHEN p_avatar_url != '' THEN p_avatar_url ELSE existing_by_phone.avatar_url END,
        full_name = CASE WHEN p_full_name != '' THEN p_full_name ELSE existing_by_phone.full_name END,
        updated_at = NOW()
      WHERE id = existing_by_phone.id;

      result_id := existing_by_phone.id;
      result_user_id := existing_by_phone.user_id;
      result_is_new := false;
    ELSE
      -- Neither email nor phone found → INSERT
      INSERT INTO public.users (email, phone, nickname, avatar_url, full_name)
      VALUES (p_email, p_phone, NULLIF(p_nickname, ''), NULLIF(p_avatar_url, ''), NULLIF(p_full_name, ''))
      RETURNING id, user_id INTO result_id, result_user_id;

      result_is_new := true;
    END IF;
  ELSE
    -- Email not found, no phone provided → INSERT bare email
    INSERT INTO public.users (email, nickname, avatar_url, full_name)
    VALUES (p_email, NULLIF(p_nickname, ''), NULLIF(p_avatar_url, ''), NULLIF(p_full_name, ''))
    RETURNING id, user_id INTO result_id, result_user_id;

    result_is_new := true;
  END IF;

  -- Return the result
  RETURN QUERY
  SELECT 
    u.id,
    u.user_id,
    u.email,
    u.phone,
    u.nickname,
    u.avatar_url,
    u.vendor_user_no,
    u.total_weight,
    u.total_points,
    u.status,
    result_is_new
  FROM public.users u
  WHERE u.id = result_id;
END;
$$;

-- ===========================================
-- 8. Keep legacy: upsert_user_by_phone (backward compat)
-- ===========================================
DROP FUNCTION IF EXISTS public.upsert_user_by_phone(
  p_phone TEXT,
  p_nickname TEXT,
  p_avatar_url TEXT,
  p_email TEXT
);

CREATE OR REPLACE FUNCTION public.upsert_user_by_phone(
  p_phone TEXT,
  p_nickname TEXT DEFAULT '',
  p_avatar_url TEXT DEFAULT '',
  p_email TEXT DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  user_id TEXT,
  email TEXT,
  phone TEXT,
  nickname TEXT,
  avatar_url TEXT,
  vendor_user_no TEXT,
  total_weight NUMERIC,
  total_points NUMERIC,
  status VARCHAR
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  existing_by_phone RECORD;
  existing_by_email RECORD;
  result_id UUID;
BEGIN
  -- Step 1: Try by phone first (legacy behavior)
  SELECT * INTO existing_by_phone FROM public.users 
  WHERE phone = p_phone 
  LIMIT 1;

  -- If found by phone → UPDATE
  IF existing_by_phone.id IS NOT NULL THEN
    UPDATE public.users SET
      nickname = COALESCE(NULLIF(p_nickname, ''), existing_by_phone.nickname),
      avatar_url = COALESCE(NULLIF(p_avatar_url, ''), existing_by_phone.avatar_url),
      email = COALESCE(NULLIF(p_email, ''), existing_by_phone.email),
      updated_at = NOW()
    WHERE id = existing_by_phone.id;

    result_id := existing_by_phone.id;
  
  -- Phone not found — try by email if provided
  ELSIF p_email IS NOT NULL AND p_email != '' THEN
    SELECT * INTO existing_by_email FROM public.users 
    WHERE email = p_email 
    LIMIT 1;

    -- Found by email → LINK phone to this record
    IF existing_by_email.id IS NOT NULL THEN
      UPDATE public.users SET
        phone = p_phone,
        nickname = COALESCE(NULLIF(p_nickname, ''), existing_by_email.nickname),
        avatar_url = COALESCE(NULLIF(p_avatar_url, ''), existing_by_email.avatar_url),
        updated_at = NOW()
      WHERE id = existing_by_email.id;

      result_id := existing_by_email.id;
    ELSE
      -- Neither found → INSERT
      INSERT INTO public.users (phone, nickname, avatar_url, email)
      VALUES (p_phone, NULLIF(p_nickname, ''), NULLIF(p_avatar_url, ''), NULLIF(p_email, ''))
      RETURNING id INTO result_id;
    END IF;
  ELSE
    -- Only phone, no email found → INSERT
    INSERT INTO public.users (phone, nickname, avatar_url)
    VALUES (p_phone, NULLIF(p_nickname, ''), NULLIF(p_avatar_url, ''))
    RETURNING id INTO result_id;
  END IF;

  RETURN QUERY
  SELECT 
    u.id,
    u.user_id,
    u.email,
    u.phone,
    u.nickname,
    u.avatar_url,
    u.vendor_user_no,
    u.total_weight,
    u.total_points,
    u.status
  FROM public.users u
  WHERE u.id = result_id;
END;
$$;

-- ===========================================
-- 9. Helper: check if email exists with a DIFFERENT phone
-- Returns the existing phone if conflict, null otherwise
-- ===========================================
CREATE OR REPLACE FUNCTION public.check_email_phone_conflict(
  p_email TEXT,
  p_phone TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  existing_phone TEXT;
BEGIN
  SELECT u.phone INTO existing_phone
  FROM public.users u
  WHERE u.email = p_email
    AND u.phone IS NOT NULL
    AND u.phone != ''
    AND u.phone != p_phone
  LIMIT 1;

  RETURN existing_phone;
END;
$$;

-- ===========================================
-- Done
-- ===========================================
SELECT 'Email as primary UID migration applied successfully' AS result;
