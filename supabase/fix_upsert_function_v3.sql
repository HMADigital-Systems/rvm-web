-- ===========================================
-- FIX v3: upsert_user_by_phone + get_user_by_phone RPCs
-- Compatible with actual users table columns
-- RETURN column names match actual column names (no "out_" prefix)
-- ===========================================

DROP FUNCTION IF EXISTS public.upsert_user_by_phone(TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.upsert_user_by_phone(TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.upsert_user_by_phone(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.upsert_user_by_phone(TEXT);
DROP FUNCTION IF EXISTS public.get_user_by_phone(TEXT);

-- ===========================================
-- UPSERT by phone (with email fallback)
-- ===========================================
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
  total_weight NUMERIC,
  total_points NUMERIC,
  status VARCHAR
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  existing RECORD;
  result_id UUID;
  clean_nick TEXT;
BEGIN
  clean_nick := COALESCE(NULLIF(p_nickname, ''), NULL);

  SELECT * INTO existing FROM public.users u1 WHERE u1.phone = p_phone LIMIT 1;

  IF existing.id IS NOT NULL THEN
    UPDATE public.users SET
      nickname = COALESCE(clean_nick, existing.nickname),
      updated_at = NOW()
    WHERE id = existing.id;
    result_id := existing.id;
  ELSIF p_email IS NOT NULL AND p_email != '' THEN
    SELECT * INTO existing FROM public.users u1 WHERE u1.email = p_email LIMIT 1;
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
    u.id, u.user_id, u.email, u.phone, u.nickname,
    u.total_weight, u.total_points, u.status::VARCHAR
  FROM public.users u WHERE u.id = result_id;
END;
$$;

-- ===========================================
-- GET user by phone
-- ===========================================
CREATE OR REPLACE FUNCTION public.get_user_by_phone(check_phone TEXT)
RETURNS TABLE(
  id UUID,
  user_id TEXT,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  nickname TEXT,
  total_weight NUMERIC,
  total_points NUMERIC,
  status VARCHAR,
  last_active_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id, u.user_id, u.full_name, u.email, u.phone, u.nickname,
    u.total_weight, u.total_points, u.status::VARCHAR,
    u.last_active_at, u.created_at
  FROM public.users u WHERE u.phone = check_phone LIMIT 1;
END;
$$;

SELECT '✅ RPC functions fixed v3 - column names match actual table' AS result;
