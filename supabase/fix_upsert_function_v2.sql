-- ===========================================
-- FIX v2: upsert_user_by_phone + get_user_by_phone RPCs
-- Compatible with actual users table columns:
--   id, user_id, full_name, email, phone, total_weight, total_points,
--   status, last_active_at, updated_at, created_at, nickName, last_synced_at,
--   nickname, customer_id
-- NO avatar_url or vendor_user_no columns exist
-- ===========================================

-- Drop ALL old signatures
DROP FUNCTION IF EXISTS public.upsert_user_by_phone(TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.upsert_user_by_phone(TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.upsert_user_by_phone(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.upsert_user_by_phone(TEXT);
DROP FUNCTION IF EXISTS public.get_user_by_phone(TEXT);

-- ===========================================
-- UPSERT by phone (with fallback to email)
-- ===========================================
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
  out_total_weight NUMERIC,
  out_total_points NUMERIC,
  out_status VARCHAR
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  existing RECORD;
  result_id UUID;
  clean_nick TEXT;
BEGIN
  clean_nick := COALESCE(NULLIF(p_nickname, ''), NULL);

  -- Step 1: Try by phone first
  SELECT * INTO existing FROM public.users WHERE phone = p_phone LIMIT 1;

  IF existing.id IS NOT NULL THEN
    -- Found by phone → UPDATE
    UPDATE public.users SET
      nickname = COALESCE(clean_nick, existing.nickname),
      updated_at = NOW()
    WHERE id = existing.id;
    result_id := existing.id;

  -- Step 2: Try by email if provided
  ELSIF p_email IS NOT NULL AND p_email != '' THEN
    SELECT * INTO existing FROM public.users WHERE email = p_email LIMIT 1;

    IF existing.id IS NOT NULL THEN
      UPDATE public.users SET
        phone = p_phone,
        nickname = COALESCE(clean_nick, existing.nickname),
        updated_at = NOW()
      WHERE id = existing.id;
      result_id := existing.id;
    ELSE
      INSERT INTO public.users (phone, nickname, email)
      VALUES (p_phone, clean_nick, p_email)
      RETURNING id INTO result_id;
    END IF;
  ELSE
    INSERT INTO public.users (phone, nickname)
    VALUES (p_phone, clean_nick)
    RETURNING id INTO result_id;
  END IF;

  RETURN QUERY
  SELECT
    u.id,
    u.user_id,
    u.email,
    u.phone,
    u.nickname,
    u.total_weight,
    u.total_points,
    u.status::VARCHAR
  FROM public.users u
  WHERE u.id = result_id;
END;
$$;

-- ===========================================
-- GET user by phone (simple lookup)
-- ===========================================
CREATE OR REPLACE FUNCTION public.get_user_by_phone(check_phone TEXT)
RETURNS TABLE(
  out_id UUID,
  out_user_id TEXT,
  out_full_name TEXT,
  out_email TEXT,
  out_phone TEXT,
  out_nickname TEXT,
  out_total_weight NUMERIC,
  out_total_points NUMERIC,
  out_status VARCHAR,
  out_last_active_at TIMESTAMPTZ,
  out_created_at TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER
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

-- Done
SELECT '✅ RPC functions fixed v2: upsert_user_by_phone + get_user_by_phone' AS result;
