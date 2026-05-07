-- Run this in Supabase SQL Editor
-- Table required for WhatsApp OTP login

CREATE TABLE IF NOT EXISTS public.otp_codes (
  phone TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Clean up expired OTPs automatically
CREATE INDEX IF NOT EXISTS idx_otp_codes_expires ON public.otp_codes(expires_at);
