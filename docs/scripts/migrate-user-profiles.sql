-- Migration: Create missing user_profiles and user_settings for existing auth.users
-- Usage: psql -f docs/scripts/migrate-user-profiles.sql

WITH missing_profiles AS (
  SELECT u.id, u.email, u.raw_user_meta_data, u.created_at
  FROM auth.users u
  LEFT JOIN public.user_profiles p ON u.id = p.id
  WHERE p.id IS NULL
),
inserted_profiles AS (
  INSERT INTO public.user_profiles (id, email, full_name, created_at, updated_at)
  SELECT id,
         email,
         COALESCE(raw_user_meta_data->>'full_name', email),
         created_at,
         created_at
  FROM missing_profiles
  ON CONFLICT (id) DO NOTHING
  RETURNING id
),
missing_settings AS (
  SELECT u.id, u.created_at
  FROM auth.users u
  LEFT JOIN public.user_settings s ON u.id = s.id
  WHERE s.id IS NULL
)
INSERT INTO public.user_settings (id, created_at, updated_at)
SELECT id, created_at, created_at
FROM missing_settings
ON CONFLICT (id) DO NOTHING;

-- Tip: To preview without changes, wrap INSERT statements with EXPLAIN or run in a transaction and ROLLBACK.

