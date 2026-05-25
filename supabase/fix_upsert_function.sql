-- ===========================================
-- FIX: upsert_user_by_phone RPC
-- Problem: "column "nickname" specified more than once" (error 42701)
-- Root cause: RETURNS TABLE(... nickname TEXT ...) creates a function variable
-- named "nickname" that conflicts with SELECT u.nickname in RETURN QUERY
-- ===========================================

-- Drop old functions with all possible parameter signatures
DROP FUNCTION IF EXISTS public.upsert_user_by_phone(TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.upsert_user_by_phone(TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.upsert_user_by_phone(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.upsert_user_by_phone(TEXT);

-- Recreate with proper column aliasing to avoid ambiguity
CREATE OR REPLACE FUNCTION public.upsert_user_by_phone(
  p_phone TEXT,
  p_nickname TEXT DEFAULT '',
  p_avatar_url TEXT DEFAULT '',
  p_email TEXT DEFAULT NULL
)
RETURNS TABLE(
  out_id UUID,
  out_user_id TEXT,
  out_email TEXT,
  out_phone TEXT,
  out_nickname TEXT,
  out_avatar_url TEXT,
  out_vendor_user_no TEXT,
  out_total_weight NUMERIC,
  out_total_points NUMERIC,
  out_status VARCHAR
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  existing RECORD;
  result_id UUID;
BEGIN
  -- Step 1: Try by phone first
  SELECT * INTO existing FROM public.users 
  WHERE phone = p_phone 
  LIMIT 1;

  -- If found by phone → UPDATE
  IF existing.id IS NOT NULL THEN
    UPDATE public.users SET
      nickname = COALESCE(NULLIF(p_nickname, ''), existing.nickname),
      avatar_url = COALESCE(NULLIF(p_avatar_url, ''), existing.avatar_url),
      email = COALESCE(NULLIF(p_email, ''), existing.email),
      updated_at = NOW()
    WHERE id = existing.id;

    result_id := existing.id;
  
  -- Phone not found — try by email if provided
  ELSIF p_email IS NOT NULL AND p_email != '' THEN
    SELECT * INTO existing FROM public.users 
    WHERE email = p_email 
    LIMIT 1;

    -- Found by email → LINK phone to this record
    IF existing.id IS NOT NULL THEN
      UPDATE public.users SET
        phone = p_phone,
        nickname = COALESCE(NULLIF(p_nickname, ''), existing.nickname),
        avatar_url = COALESCE(NULLIF(p_avatar_url, ''), existing.avatar_url),
        updated_at = NOW()
      WHERE id = existing.id;

      result_id := existing.id;
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
    u.status::VARCHAR
  FROM public.users u
  WHERE u.id = result_id;
END;
$$;

-- ===========================================
-- ALSO FIX: get_user_by_phone RPC (missing)
-- ===========================================
DROP FUNCTION IF EXISTS public.get_user_by_phone(TEXT);

CREATE OR REPLACE FUNCTION public.get_user_by_phone(check_phone TEXT)
RETURNS TABLE(
  out_id UUID,
  out_user_id TEXT,
  out_full_name TEXT,
  out_email TEXT,
  out_phone TEXT,
  out_nickname TEXT,
  out_avatar_url TEXT,
  out_vendor_user_no TEXT,
  out_total_weight NUMERIC,
  out_total_points NUMERIC,
  out_status VARCHAR,
  out_last_active_at TIMESTAMPTZ,
  out_created_at TIMESTAMPTZ
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
    u.status::VARCHAR,
    u.last_active_at,
    u.created_at
  FROM public.users u
  WHERE u.phone = check_phone
  LIMIT 1;
END;
$$;

-- Verification
SELECT '✅ RPC functions fixed: upsert_user_by_phone + get_user_by_phone' AS result;
