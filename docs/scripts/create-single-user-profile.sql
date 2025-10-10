-- Create profile/settings for a single user by id
-- Usage: \set uid '00000000-0000-0000-0000-000000000000'
-- Then: psql -f docs/scripts/create-single-user-profile.sql

INSERT INTO public.user_profiles (id, email, full_name, created_at, updated_at)
SELECT u.id,
       u.email,
       COALESCE(u.raw_user_meta_data->>'full_name', u.email),
       u.created_at,
       u.created_at
FROM auth.users u
WHERE u.id = :'uid'
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_settings (id, created_at, updated_at)
SELECT u.id, u.created_at, u.created_at
FROM auth.users u
WHERE u.id = :'uid'
ON CONFLICT (id) DO NOTHING;

