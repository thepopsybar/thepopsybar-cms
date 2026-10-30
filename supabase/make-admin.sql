-- =====================================================================
-- Make an existing Supabase Auth user an administrator.
-- 1) Create the user first: Supabase Dashboard -> Authentication -> Users -> Add user
--    (choose "Create new user", enter their email and a strong password of YOUR choice,
--    and tick "Auto Confirm User").
-- 2) Replace the email below with that user's email, then run this in the SQL Editor.
-- =====================================================================
insert into public.admins (user_id)
select id from auth.users where email = 'REPLACE_WITH_ADMIN_EMAIL'
on conflict (user_id) do nothing;

-- Check it worked (should return one row):
select a.user_id, u.email from public.admins a join auth.users u on u.id = a.user_id;
