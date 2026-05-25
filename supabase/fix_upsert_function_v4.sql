-- ===========================================
-- FIX v4: upsert_user_by_phone + get_user_by_phone RPCs
-- Uses RETURNS SETOF users to avoid column name conflicts
-- ===========================================

DROP FUNCTION IF EXISTS public.upsert_user_by_phone(TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.upsert_user_by_phone(TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.upsert_user_by_phone(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.upsert_user_by_phone(TEXT);
DROP FUNCTION IF EXISTS public.get_user_by_phone(TEXT);

-- ===========================================
-- UPSERT by phone
-- ===========================================
CREATE OR REPLACE FUNCTION public.upsert_user_by_phone(
  p_phone TEXT,
  p_nickname TEXT DEFAULT '',
  p_avatar_url TEXT DEFAULT '',
  p_email TEXT DEFAULT NULL
)
RETURNS SETOF public.users
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
    UPDATE public.users u1 SET
      nickname = COALESCE(clean_nick, existing.nickname),
      updated_at = NOW()
    WHERE u1.id = existing.id;
    result_id := existing.id;
  ELSIF p_email IS NOT NULL AND p_email != '' THEN
    SELECT * INTO existing FROM public.users u1 WHERE u1.email = p_email LIMIT 1;
    IF existing.id IS NOT NULL THEN
      UPDATE public.users u1 SET
        phone = p_phone,
        nickname = COALESCE(clean_nick, existing.nickname),
        updated_at = NOW()
      WHERE u1.id = existing.id;
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

  RETURN QUERY SELECT * FROM public.users u1 WHERE u1.id = result_id;
END;
$$;

-- ===========================================
-- GET user by phone
-- ===========================================
CREATE OR REPLACE FUNCTION public.get_user_by_phone(check_phone TEXT)
RETURNS SETOF public.users
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY SELECT * FROM public.users u WHERE u.phone = check_phone LIMIT 1;
END;
$$;

SELECT '✅ RPC functions fixed v4 - uses SETOF users' AS result;
