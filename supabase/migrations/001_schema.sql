-- ============================================================================
-- MOOC Solat Mercu Kejayaan — Skema Supabase
-- Jalankan di Supabase SQL Editor (sekali sahaja).
-- ============================================================================

create extension if not exists pgcrypto;
create extension if not exists pg_net with schema extensions;

-- ---------------------------------------------------------------------------
-- Profil pengguna (lanjutan auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  class_name text,
  role text not null default 'STUDENT' check (role in ('STUDENT', 'ADMIN')),
  profile_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'ADMIN'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- Cipta profil automatik untuk setiap pengguna auth baharu.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(coalesce(new.email, ''));
  v_admin boolean := (v_email = 'zfzariff2@gmail.com');
  v_name text := nullif(trim(coalesce(new.raw_user_meta_data->>'full_name', '')), '');
begin
  insert into public.profiles (id, email, role, profile_completed, full_name)
  values (
    new.id,
    v_email,
    case when v_admin then 'ADMIN' else 'STUDENT' end,
    v_admin,
    case when v_admin then coalesce(v_name, 'PENTADBIR') else v_name end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Backfill pengguna auth yang sudah wujud sebelum trigger dicipta.
insert into public.profiles (id, email, role, profile_completed, full_name)
select
  u.id,
  lower(u.email),
  case when lower(u.email) = 'zfzariff2@gmail.com' then 'ADMIN' else 'STUDENT' end,
  case when lower(u.email) = 'zfzariff2@gmail.com' then true else false end,
  case
    when lower(u.email) = 'zfzariff2@gmail.com' then coalesce(nullif(trim(u.raw_user_meta_data->>'full_name'), ''), 'PENTADBIR')
    else nullif(trim(u.raw_user_meta_data->>'full_name'), '')
  end
from auth.users u
where u.email is not null
on conflict (id) do nothing;

-- Pastikan akaun admin sentiasa mempunyai peranan ADMIN, walaupun profil
-- telah wujud sebelum trigger dicipta.
update public.profiles
   set role = 'ADMIN',
       profile_completed = true,
       full_name = coalesce(full_name, 'PENTADBIR'),
       updated_at = now()
 where lower(email) = 'zfzariff2@gmail.com';

-- ---------------------------------------------------------------------------
-- Metadata kursus (diselaraskan dengan kandungan frontend)
-- ---------------------------------------------------------------------------
create table if not exists public.course_lessons (
  id text primary key,
  title text not null,
  "order" int not null,
  total_slides int not null,
  quiz_id text not null,
  slide_ids text[] not null default '{}'
);

create table if not exists public.course_quizzes (
  id text primary key,
  lesson_id text references public.course_lessons(id) on delete cascade,
  title text not null,
  kind text not null check (kind in ('MODULE', 'FINAL')),
  passing_score int not null default 80,
  question_count int not null
);

-- Kunci jawapan — TIDAK boleh dibaca pelajar.
create table if not exists public.question_keys (
  question_id text primary key,
  quiz_id text not null,
  quiz_kind text not null check (quiz_kind in ('MODULE', 'FINAL')),
  correct_answer text not null check (correct_answer in ('A', 'B', 'C', 'D')),
  points int not null default 1,
  explanation text not null default ''
);

-- ---------------------------------------------------------------------------
-- Kemajuan pelajar
-- ---------------------------------------------------------------------------
create table if not exists public.slide_progress (
  student_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id text not null,
  slide_id text not null,
  viewed_at timestamptz not null default now(),
  primary key (student_id, slide_id)
);

create table if not exists public.lesson_progress (
  student_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id text not null,
  slides_viewed int not null default 0,
  total_slides int not null default 0,
  completed boolean not null default false,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (student_id, lesson_id)
);

create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  quiz_id text not null,
  score int not null,
  total int not null,
  percentage int not null,
  passed boolean not null,
  answers jsonb not null default '{}'::jsonb,
  completed_at timestamptz not null default now()
);

create table if not exists public.final_assessment_attempts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null unique references public.profiles(id) on delete cascade,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  duration_seconds int,
  score int,
  total int not null default 20,
  percentage int,
  answers jsonb,
  certificate_number text,
  created_at timestamptz not null default now()
);

create sequence if not exists public.certificate_seq start 1;

create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  certificate_number text not null unique,
  student_id uuid not null unique references public.profiles(id) on delete cascade,
  student_name text,
  class_name text,
  issued_at timestamptz not null default now(),
  score int,
  total int,
  duration_seconds int
);

alter table public.certificates add column if not exists student_name text;
alter table public.certificates add column if not exists class_name text;

-- ---------------------------------------------------------------------------
-- Sync Google Sheets
-- ---------------------------------------------------------------------------
create table if not exists public.sheet_sync_queue (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  payload jsonb not null,
  status text not null default 'PENDING' check (status in ('PENDING', 'SENT', 'FAILED')),
  attempts int not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create table if not exists public.app_settings (
  key text primary key,
  value text not null default ''
);

insert into public.app_settings (key, value)
values ('sheet_webhook_url', ''), ('sheet_webhook_secret', '')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- Indeks
-- ---------------------------------------------------------------------------
create index if not exists idx_quiz_attempts_student on public.quiz_attempts(student_id, quiz_id);
create index if not exists idx_lesson_progress_student on public.lesson_progress(student_id);
create index if not exists idx_slide_progress_student on public.slide_progress(student_id, lesson_id);
create index if not exists idx_final_ranking on public.final_assessment_attempts(submitted_at, score desc, duration_seconds asc);
create index if not exists idx_sheet_queue_status on public.sheet_sync_queue(status, created_at);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.course_lessons enable row level security;
alter table public.course_quizzes enable row level security;
alter table public.question_keys enable row level security;
alter table public.slide_progress enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.final_assessment_attempts enable row level security;
alter table public.certificates enable row level security;
alter table public.sheet_sync_queue enable row level security;
alter table public.app_settings enable row level security;

-- Profil
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select to authenticated using (auth.uid() = id);

drop policy if exists profiles_select_admin on public.profiles;
create policy profiles_select_admin on public.profiles
  for select to authenticated using (public.is_admin());

-- Kandungan metadata (boleh dibaca semua)
drop policy if exists course_lessons_read on public.course_lessons;
create policy course_lessons_read on public.course_lessons
  for select to anon, authenticated using (true);

drop policy if exists course_quizzes_read on public.course_quizzes;
create policy course_quizzes_read on public.course_quizzes
  for select to anon, authenticated using (true);

-- Data pelajar: baca sendiri; admin baca semua.
drop policy if exists slide_progress_select_own on public.slide_progress;
create policy slide_progress_select_own on public.slide_progress
  for select to authenticated using (auth.uid() = student_id);

drop policy if exists slide_progress_select_admin on public.slide_progress;
create policy slide_progress_select_admin on public.slide_progress
  for select to authenticated using (public.is_admin());

drop policy if exists lesson_progress_select_own on public.lesson_progress;
create policy lesson_progress_select_own on public.lesson_progress
  for select to authenticated using (auth.uid() = student_id);

drop policy if exists lesson_progress_select_admin on public.lesson_progress;
create policy lesson_progress_select_admin on public.lesson_progress
  for select to authenticated using (public.is_admin());

drop policy if exists quiz_attempts_select_own on public.quiz_attempts;
create policy quiz_attempts_select_own on public.quiz_attempts
  for select to authenticated using (auth.uid() = student_id);

drop policy if exists quiz_attempts_select_admin on public.quiz_attempts;
create policy quiz_attempts_select_admin on public.quiz_attempts
  for select to authenticated using (public.is_admin());

drop policy if exists final_attempts_select_own on public.final_assessment_attempts;
create policy final_attempts_select_own on public.final_assessment_attempts
  for select to authenticated using (auth.uid() = student_id);

drop policy if exists final_attempts_select_admin on public.final_assessment_attempts;
create policy final_attempts_select_admin on public.final_assessment_attempts
  for select to authenticated using (public.is_admin());

drop policy if exists certificates_select_own on public.certificates;
create policy certificates_select_own on public.certificates
  for select to authenticated using (auth.uid() = student_id);

drop policy if exists certificates_select_admin on public.certificates;
create policy certificates_select_admin on public.certificates
  for select to authenticated using (public.is_admin());

drop policy if exists sheet_queue_admin on public.sheet_sync_queue;
create policy sheet_queue_admin on public.sheet_sync_queue
  for select to authenticated using (public.is_admin());

-- Tiada polisi untuk question_keys / app_settings — hanya RPC security definer.

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
revoke all on public.question_keys from anon, authenticated;
revoke all on public.app_settings from anon, authenticated;
revoke all on public.sheet_sync_queue from anon, authenticated;

grant select on public.course_lessons to anon, authenticated;
grant select on public.course_quizzes to anon, authenticated;
grant select on public.profiles to authenticated;
grant select on public.slide_progress to authenticated;
grant select on public.lesson_progress to authenticated;
grant select on public.quiz_attempts to authenticated;
grant select on public.final_assessment_attempts to authenticated;
grant select on public.certificates to authenticated;
grant select on public.sheet_sync_queue to authenticated;

-- Pelajar tidak boleh insert/update/delete terus; semua melalui RPC.
revoke insert, update, delete on public.profiles from anon, authenticated;
revoke insert, update, delete on public.slide_progress from anon, authenticated;
revoke insert, update, delete on public.lesson_progress from anon, authenticated;
revoke insert, update, delete on public.quiz_attempts from anon, authenticated;
revoke insert, update, delete on public.final_assessment_attempts from anon, authenticated;
revoke insert, update, delete on public.certificates from anon, authenticated;
revoke insert, update, delete on public.sheet_sync_queue from anon, authenticated;
revoke insert, update, delete on public.course_lessons from anon, authenticated;
revoke insert, update, delete on public.course_quizzes from anon, authenticated;
