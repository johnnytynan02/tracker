-- Tracker — Supabase schema
-- Paste this whole file into Supabase > SQL Editor > New query > Run.
-- Safe to re-run: everything is idempotent.

-- ============================================================
-- 1. Storage
-- ============================================================
-- One row per user per section. The app reads and writes whole sections,
-- so document-style storage matches how it actually behaves. The views at
-- the bottom give you proper relational tables for querying.

create table if not exists public.user_data (
  user_id    uuid        not null references auth.users(id) on delete cascade,
  key        text        not null,
  value      jsonb       not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

create index if not exists user_data_user_idx on public.user_data(user_id);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists user_data_touch on public.user_data;
create trigger user_data_touch before update on public.user_data
  for each row execute function public.touch_updated_at();

-- ============================================================
-- 2. Row Level Security
-- ============================================================
-- This is what actually protects the data. The anon key in the app is public
-- by design; without these policies anyone could read every user's rows.
-- Do not skip this section.

alter table public.user_data enable row level security;

drop policy if exists "read own data"   on public.user_data;
drop policy if exists "insert own data" on public.user_data;
drop policy if exists "update own data" on public.user_data;
drop policy if exists "delete own data" on public.user_data;

create policy "read own data"   on public.user_data for select using (auth.uid() = user_id);
create policy "insert own data" on public.user_data for insert with check (auth.uid() = user_id);
create policy "update own data" on public.user_data for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete own data" on public.user_data for delete using (auth.uid() = user_id);

-- ============================================================
-- 3. Analysis views
-- ============================================================
-- Flatten the JSON into one row per observation. Query these from Count or
-- the SQL editor as if they were ordinary tables.
--
-- Views inherit RLS from user_data, so each signed-in user sees only their
-- own rows. Connecting via the Postgres connection string (as Count does)
-- uses a privileged role that bypasses RLS and sees everyone — filter on
-- user_id yourself when you do that.

-- ---------- workouts: one row per set ----------
create or replace view public.v_workout_sets as
select
  d.user_id,
  (w->>'date')::date                        as date,
  w->>'id'                                  as workout_id,
  nullif(w->>'routineName', '')             as routine,
  e->>'name'                                as exercise,
  coalesce(e->>'kind', 'strength')          as kind,
  s.ord::int                                as set_number,
  nullif(s.val->>'weight',   '')::numeric   as weight_kg,
  nullif(s.val->>'reps',     '')::numeric   as reps,
  nullif(s.val->>'minutes',  '')::numeric   as minutes,
  nullif(s.val->>'distance', '')::numeric   as distance_km,
  nullif(s.val->>'speed',    '')::numeric   as speed_kmh,
  nullif(s.val->>'incline',  '')::numeric   as incline_pct,
  nullif(s.val->>'rounds',   '')::numeric   as rounds,
  nullif(s.val->>'weight', '')::numeric
    * nullif(s.val->>'reps', '')::numeric   as volume_kg
from public.user_data d
cross join lateral jsonb_array_elements(d.value) w
cross join lateral jsonb_array_elements(w->'exercises') e
cross join lateral jsonb_array_elements(e->'sets') with ordinality s(val, ord)
where d.key = 'workouts'
  and jsonb_typeof(e) = 'object';

-- ---------- food ----------
create or replace view public.v_food_log as
select
  d.user_id,
  (f->>'date')::date                          as date,
  coalesce(nullif(f->>'slot', ''), 'Unspecified') as slot,
  f->>'name'                                  as item,
  (f->>'calories')::numeric                   as calories,
  (f->>'protein')::numeric                    as protein_g,
  (f->>'carbs')::numeric                      as carbs_g,
  (f->>'fat')::numeric                        as fat_g
from public.user_data d
cross join lateral jsonb_array_elements(d.value) f
where d.key = 'food-log';

create or replace view public.v_food_daily as
select user_id, date,
       sum(calories)  as calories,
       sum(protein_g) as protein_g,
       sum(carbs_g)   as carbs_g,
       sum(fat_g)     as fat_g,
       count(*)       as items
from public.v_food_log
group by user_id, date;

-- ---------- weight ----------
create or replace view public.v_weight_log as
select
  d.user_id,
  (w->>'date')::date        as date,
  (w->>'weight')::numeric   as weight_kg
from public.user_data d
cross join lateral jsonb_array_elements(d.value) w
where d.key = 'weight-log';

-- ---------- niggles: long format, one row per body area per day ----------
-- Long rather than wide so adding a body area never changes the schema.
create or replace view public.v_niggle_log as
select
  d.user_id,
  (n->>'date')::date                   as date,
  r.key                                as region,
  r.value::text::numeric               as soreness,
  (select string_agg(a #>> '{}', '; ')
     from jsonb_array_elements(coalesce(n->'activity', '[]'::jsonb)) a) as activities,
  nullif(n->>'activityDetail', '')     as activity_detail,
  nullif(n->>'sorenessDetail', '')     as soreness_detail,
  nullif(n->>'notes', '')              as notes
from public.user_data d
cross join lateral jsonb_array_elements(d.value) n
cross join lateral jsonb_each(coalesce(n->'soreness', '{}'::jsonb)) r
where d.key = 'niggle-log';

-- ---------- niggle scale questions (intensity, stiffness, custom) ----------
create or replace view public.v_niggle_scales as
select d.user_id, (n->>'date')::date as date, s.key as question, s.value::text::numeric as value
from public.user_data d
cross join lateral jsonb_array_elements(d.value) n
cross join lateral jsonb_each(coalesce(n->'scales', '{}'::jsonb)) s
where d.key = 'niggle-log'
union all
-- entries created before the configurable version stored these at the top level
select d.user_id, (n->>'date')::date, 'intensity', (n->>'intensity')::numeric
from public.user_data d cross join lateral jsonb_array_elements(d.value) n
where d.key = 'niggle-log' and n ? 'intensity'
union all
select d.user_id, (n->>'date')::date, 'stiffness', (n->>'stiffness')::numeric
from public.user_data d cross join lateral jsonb_array_elements(d.value) n
where d.key = 'niggle-log' and n ? 'stiffness';

-- ---------- custom test metrics ----------
create or replace view public.v_test_metrics as
select
  e.user_id,
  (ent->>'date')::date                as date,
  coalesce(m.name, ent->>'metricId')  as metric,
  m.unit                              as unit,
  (ent->>'value')::numeric            as value
from public.user_data e
cross join lateral jsonb_array_elements(e.value) ent
left join (
  select d.user_id, mm->>'id' as id, mm->>'name' as name, mm->>'unit' as unit
  from public.user_data d
  cross join lateral jsonb_array_elements(d.value) mm
  where d.key = 'test-metrics'
) m on m.user_id = e.user_id and m.id = ent->>'metricId'
where e.key = 'test-entries';

-- ---------- one row per day, everything joined ----------
-- The table most worth having: did training load or macros move soreness?
create or replace view public.v_daily_summary as
with days as (
  select user_id, date from public.v_food_daily
  union select user_id, date from public.v_weight_log
  union select user_id, date from public.v_niggle_log
  union select user_id, date from public.v_workout_sets
)
select
  d.user_id,
  d.date,
  f.calories, f.protein_g, f.carbs_g, f.fat_g,
  w.weight_kg,
  t.total_volume_kg, t.cardio_minutes, t.exercises,
  n.max_soreness, n.mean_soreness
from days d
left join public.v_food_daily f on f.user_id = d.user_id and f.date = d.date
left join public.v_weight_log w on w.user_id = d.user_id and w.date = d.date
left join (
  select user_id, date,
         sum(volume_kg) filter (where kind = 'strength') as total_volume_kg,
         sum(minutes)   filter (where kind = 'cardio')   as cardio_minutes,
         count(distinct exercise)                        as exercises
  from public.v_workout_sets group by user_id, date
) t on t.user_id = d.user_id and t.date = d.date
left join (
  select user_id, date, max(soreness) as max_soreness, round(avg(soreness), 2) as mean_soreness
  from public.v_niggle_log group by user_id, date
) n on n.user_id = d.user_id and n.date = d.date;
