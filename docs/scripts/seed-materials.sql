-- Seed materials and pricing_policies (Story 2.3A.3)
-- Run: psql "$DATABASE_URL" -f docs/scripts/seed-materials.sql
--   or: npx supabase db execute --file docs/scripts/seed-materials.sql

-- materials
insert into materials (id, name, type, base_price_per_unit, is_active, thumbnail_url)
values
  ('wood','Wood','wood',100,true,'/materials/wood.png'),
  ('mdf','MDF','mdf',100,true,'/materials/mdf.png'),
  ('steel','Steel','steel',100,true,'/materials/steel.png'),
  ('metal','Metal','metal',100,true,'/materials/metal.png'),
  ('glass','Glass','glass',100,true,'/materials/glass.png'),
  ('fabric','Fabric','fabric',100,true,'/materials/fabric.png')
on conflict (id) do update set
  name=excluded.name,
  type=excluded.type,
  base_price_per_unit=excluded.base_price_per_unit,
  is_active=excluded.is_active,
  thumbnail_url=excluded.thumbnail_url;

-- pricing_policies (align with 2.3A.2 constants)
insert into pricing_policies (material_type, base_price_per_m3, price_modifier, legacy_material, is_active)
values
  ('wood',50000,1.0,true,true),
  ('mdf',50000,0.8,true,true),
  ('steel',50000,1.15,true,true),
  ('metal',50000,1.5,false,true),
  ('glass',50000,2.0,false,true),
  ('fabric',50000,0.8,false,true)
on conflict (material_type) do update set
  base_price_per_m3=excluded.base_price_per_m3,
  price_modifier=excluded.price_modifier,
  legacy_material=excluded.legacy_material,
  is_active=excluded.is_active;

