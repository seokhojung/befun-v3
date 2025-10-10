-- Report: Check for missing user_profiles and user_settings rows

-- Missing profiles
SELECT u.id, u.email, u.created_at
FROM auth.users u
LEFT JOIN public.user_profiles p ON u.id = p.id
WHERE p.id IS NULL
ORDER BY u.created_at DESC;

-- Missing settings
SELECT u.id, u.email, u.created_at
FROM auth.users u
LEFT JOIN public.user_settings s ON u.id = s.id
WHERE s.id IS NULL
ORDER BY u.created_at DESC;

