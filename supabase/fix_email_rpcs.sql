-- ===========================================
-- FIX v5: All broken Email-based RPC functions
-- ALREADY FIXED in v4: upsert_user_by_phone, get_user_by_phone
-- ===========================================

-- Drop all affected functions
DROP FUNCTION IF EXISTS public.get_user_by_email(TEXT);
DROP FUNCTION IF EXISTS public.upsert_user_by_email(TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.check_email_phone_conflict(TEXT, TEXT);

-- ===========================================
-- get_user_by_email
-- ===========================================
CREATE OR REPLACE FUNCTION public.get_user_by_email(check_email TEXT)
RETURNS TABLE(
  id UUID, user_id TEXT, full_name TEXT, email TEXT, phone TEXT,
  nickname TEXT, total_weight NUMERIC, total_points NUMERIC,
  status VARCHAR, last_active_at TIMESTAMPTZ, created_at TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.user_id, u.full_name, u.email, u.phone, u.nickname,
    u.total_weight, u.total_points, u.status::VARCHAR,
    u.last_active_at, u.created_at
  FROM public.users u WHERE u.email = check_email LIMIT 1;
END;
$$;

-- ===========================================
-- upsert_user_by_email
-- ===========================================
CREATE OR REPLACE FUNCTION public.upsert_user_by_email(
  p_email TEXT,
  p_phone TEXT DEFAULT '',
  p_nickname TEXT DEFAULT '',
  p_avatar_url TEXT DEFAULT '',
  p_full_name TEXT DEFAULT ''
)
RETURNS SETOF public.users
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  existing RECORD;
  result_id UUID;
BEGIN
  -- Try by email first
  SELECT * INTO existing FROM public.users u1 WHERE u1.email = p_email LIMIT 1;

  IF existing.id IS NOT NULL THEN
    UPDATE public.users u1 SET
      phone = COALESCE(NULLIF(p_phone, ''), existing.phone),
      nickname = COALESCE(NULLIF(p_nickname, ''), existing.nickname),
      full_name = COALESCE(NULLIF(p_full_name, ''), existing.full_name),
      updated_at = NOW()
    WHERE u1.id = existing.id;
    result_id := existing.id;
  ELSIF p_phone IS NOT NULL AND p_phone != '' THEN
    SELECT * INTO existing FROM public.users u1 WHERE u1.phone = p_phone LIMIT 1;
    IF existing.id IS NOT NULL THEN
      UPDATE public.users u1 SET
        email = p_email,
        nickname = CASE WHEN p_nickname != '' THEN p_nickname ELSE existing.nickname END,
        full_name = CASE WHEN p_full_name != '' THEN p_full_name ELSE existing.full_name END,
        updated_at = NOW()
      WHERE u1.id = existing.id;
      result_id := existing.id;
    ELSE
      INSERT INTO public.users (email, phone, nickname, full_name)
      VALUES (p_email, p_phone, NULLIF(p_nickname, ''), NULLIF(p_full_name, ''))
      RETURNING id INTO result_id;
    END IF;
  ELSE
    INSERT INTO public.users (email, nickname, full_name)
    VALUES (p_email, NULLIF(p_nickname, ''), NULLIF(p_full_name, ''))
    RETURNING id INTO result_id;
  END IF;

  RETURN QUERY SELECT * FROM public.users u1 WHERE u1.id = result_id;
END;
$$;

-- ===========================================
-- check_email_phone_conflict
-- ===========================================
CREATE OR REPLACE FUNCTION public.check_email_phone_conflict(p_email TEXT, p_phone TEXT)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  existing_phone TEXT;
BEGIN
  SELECT u1.phone INTO existing_phone
  FROM public.users u1
  WHERE u1.email = p_email
    AND u1.phone IS NOT NULL
    AND u1.phone != ''
    AND u1.phone != p_phone
  LIMIT 1;
  RETURN existing_phone;
END;
$$;

SELECT '✅ v5 fix applied: get_user_by_email, upsert_user_by_email, check_email_phone_conflict' AS result;
