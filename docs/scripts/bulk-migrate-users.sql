-- Bulk migrate users created after a given date
-- Usage: \set since '2024-01-01'

WITH candidates AS (
  SELECT u.id, u.email, u.raw_user_meta_data, u.created_at
  FROM auth.users u
  WHERE u.created_at::date >= :'since'::date
),
missing_profiles AS (
  SELECT c.*
  FROM candidates c
  LEFT JOIN public.user_profiles p ON c.id = p.id
  WHERE p.id IS NULL
),
ins_profiles AS (
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
  SELECT c.id, c.created_at
  FROM candidates c
  LEFT JOIN public.user_settings s ON c.id = s.id
  WHERE s.id IS NULL
)
INSERT INTO public.user_settings (id, created_at, updated_at)
SELECT id, created_at, created_at
FROM missing_settings
ON CONFLICT (id) DO NOTHING;

