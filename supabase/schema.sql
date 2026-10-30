-- =====================================================================
-- The Popsy Bar: Supabase schema, Row Level Security and seed data
-- Run this ONCE in Supabase Dashboard -> SQL Editor -> New query.
-- It is safe to run again: tables use "if not exists" and the seed only
-- runs while gallery_images is empty.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Admin list. A user is an admin only if their auth user id is here.
--    Rows are added by you in the SQL Editor (see README), never by the site.
-- ---------------------------------------------------------------------
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- ---------------------------------------------------------------------
-- 2. Editable text, links and images. One row per overridden field.
--    key example: "home.hero.title". Missing rows fall back to the defaults in code.
-- ---------------------------------------------------------------------
create table if not exists public.site_content (
  key text primary key check (char_length(key) <= 200),
  value text not null check (char_length(value) <= 5000),
  public_id text,                       -- Cloudinary public id when value is an uploaded image
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 3. Section order and visibility (homepage, about, experience pages, gallery categories).
-- ---------------------------------------------------------------------
create table if not exists public.section_settings (
  page text not null,
  section text not null,
  position integer not null default 0,
  enabled boolean not null default true,
  primary key (page, section)
);

-- ---------------------------------------------------------------------
-- 4. Gallery photos. category = occasion slug (e.g. "bridal-baby-shower").
-- ---------------------------------------------------------------------
create table if not exists public.gallery_images (
  id uuid primary key default gen_random_uuid(),
  seq bigint generated always as identity,
  category text not null,
  image_url text not null,
  public_id text,
  alt text not null check (char_length(alt) between 1 and 300),
  position integer not null default 0,
  featured boolean not null default false,   -- shown in the homepage gallery strip
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists gallery_images_category_idx on public.gallery_images (category, position);

-- ---------------------------------------------------------------------
-- 5. Row Level Security: public can only READ public content; only admins can WRITE.
-- ---------------------------------------------------------------------
alter table public.admins enable row level security;
alter table public.site_content enable row level security;
alter table public.section_settings enable row level security;
alter table public.gallery_images enable row level security;

-- admins: a signed-in user may see only their own row (used to check access). No write policies at all.
drop policy if exists "admins read own row" on public.admins;
create policy "admins read own row" on public.admins
  for select to authenticated using (user_id = auth.uid());

-- site_content
drop policy if exists "public read content" on public.site_content;
create policy "public read content" on public.site_content
  for select to anon, authenticated using (true);
drop policy if exists "admins insert content" on public.site_content;
create policy "admins insert content" on public.site_content
  for insert to authenticated with check (public.is_admin());
drop policy if exists "admins update content" on public.site_content;
create policy "admins update content" on public.site_content
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admins delete content" on public.site_content;
create policy "admins delete content" on public.site_content
  for delete to authenticated using (public.is_admin());

-- section_settings
drop policy if exists "public read sections" on public.section_settings;
create policy "public read sections" on public.section_settings
  for select to anon, authenticated using (true);
drop policy if exists "admins insert sections" on public.section_settings;
create policy "admins insert sections" on public.section_settings
  for insert to authenticated with check (public.is_admin());
drop policy if exists "admins update sections" on public.section_settings;
create policy "admins update sections" on public.section_settings
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admins delete sections" on public.section_settings;
create policy "admins delete sections" on public.section_settings
  for delete to authenticated using (public.is_admin());

-- gallery_images: visitors see only visible photos; admins see everything.
drop policy if exists "public read visible gallery" on public.gallery_images;
create policy "public read visible gallery" on public.gallery_images
  for select to anon, authenticated using (enabled or public.is_admin());
drop policy if exists "admins insert gallery" on public.gallery_images;
create policy "admins insert gallery" on public.gallery_images
  for insert to authenticated with check (public.is_admin());
drop policy if exists "admins update gallery" on public.gallery_images;
create policy "admins update gallery" on public.gallery_images
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admins delete gallery" on public.gallery_images;
create policy "admins delete gallery" on public.gallery_images
  for delete to authenticated using (public.is_admin());

-- Table privileges (RLS above still applies on top of these).
grant select on public.site_content, public.section_settings, public.gallery_images to anon, authenticated;
grant insert, update, delete on public.site_content, public.section_settings, public.gallery_images to authenticated;
grant select on public.admins to authenticated;

-- ---------------------------------------------------------------------
-- 6. Seed: the photos that already ship with the website (/public/images).
--    Cultural Celebration and Graduation have no photos yet, on purpose.
-- ---------------------------------------------------------------------
insert into public.gallery_images (category, image_url, alt, position, featured)
select * from (values
  ('corporate', '/images/gallery-1.jpeg', 'A host serving drinks to guests at a Popsy Bar cart', 1, true),
  ('bridal-baby-shower', '/images/gallery-2.jpeg', 'Baby shower mocktail cart with floral signage', 1, true),
  ('private-party', '/images/gallery-3.jpeg', 'Whale-shaped dessert bowl garnished with an orchid', 1, true),
  ('private-party', '/images/gallery-4.jpeg', 'Iced citrus drink beside orange slices and a branded cup', 2, true),
  ('brand-activation', '/images/gallery-5.jpeg', 'Two hosts posing beside a styled, branded event cart', 1, true),
  ('bridal-baby-shower', '/images/gallery-6.jpeg', 'Seashell-shaped mocktail with an orchid garnish', 2, true),
  ('private-party', '/images/gallery-7.jpeg', 'Watermelon drink with lime and lemon slices on a branded cup', 3, true),
  ('private-party', '/images/gallery-8.jpeg', 'Gold Popsy Bar sign hanging from a cart', 4, true),
  ('brand-activation', '/images/cart-preview.jpeg', 'Branded cart with a LURÉ × Luchiana Design sign', 2, false),
  ('brand-activation', '/images/gallery-9.jpeg', 'Guest posing with a LURÉ jar at an event', 3, false),
  ('wedding', '/images/hero-bg-1.jpeg', 'Styled event space with round tables and a mobile cart', 1, false),
  ('birthday', '/images/hero-bg-2.jpeg', 'Colourful checkered dessert cart styled with flowers', 1, false),
  ('birthday', '/images/hero-bg-4.jpeg', 'Pink balloon backdrop with a storybook-themed sign', 2, false),
  ('bridal-baby-shower', '/images/hero-bg-3.jpeg', 'Pastel balloon garland setup at a shower', 3, false)
) as seed(category, image_url, alt, position, featured)
where not exists (select 1 from public.gallery_images);
