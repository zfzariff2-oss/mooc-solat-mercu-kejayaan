-- ============================================================
-- MOOC Solat Mercu Kejayaan — SETUP LENGKAP
-- Tampal keseluruhan fail ini dalam Supabase SQL Editor, kemudian Run.
-- ============================================================


-- ==================== 001_schema.sql ====================

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


-- ==================== 002_rpc.sql ====================

-- ============================================================================
-- MOOC Solat Mercu Kejayaan — RPC & logik server
-- Jalankan selepas 001_schema.sql.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Helper: kira semula kemajuan satu modul
-- ---------------------------------------------------------------------------
create or replace function public.recalc_lesson_progress(p_student_id uuid, p_lesson_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total int;
  v_quiz_id text;
  v_viewed int;
  v_passed boolean;
  v_completed boolean;
begin
  select total_slides, quiz_id into v_total, v_quiz_id
  from public.course_lessons where id = p_lesson_id;
  if not found then
    raise exception 'Modul tidak dijumpai.';
  end if;

  select count(*) into v_viewed
  from public.slide_progress
  where student_id = p_student_id and lesson_id = p_lesson_id;

  select exists(
    select 1 from public.quiz_attempts
    where student_id = p_student_id and quiz_id = v_quiz_id and passed = true
  ) into v_passed;

  v_completed := (v_viewed >= v_total and v_passed);

  insert into public.lesson_progress
    (student_id, lesson_id, slides_viewed, total_slides, completed, completed_at, updated_at)
  values
    (p_student_id, p_lesson_id, v_viewed, v_total, v_completed,
     case when v_completed then now() else null end, now())
  on conflict (student_id, lesson_id) do update set
    slides_viewed = excluded.slides_viewed,
    total_slides = excluded.total_slides,
    completed = excluded.completed,
    completed_at = case
      when excluded.completed then coalesce(lesson_progress.completed_at, now())
      else null
    end,
    updated_at = now();

  return jsonb_build_object(
    'lesson_id', p_lesson_id,
    'slides_viewed', v_viewed,
    'total_slides', v_total,
    'quiz_passed', v_passed,
    'completed', v_completed
  );
end;
$$;

revoke all on function public.recalc_lesson_progress(uuid, text) from public;

-- ---------------------------------------------------------------------------
-- Helper: semua modul selesai?
-- ---------------------------------------------------------------------------
create or replace function public.has_completed_all_modules(p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (
    select 1
    from public.course_lessons cl
    left join public.lesson_progress lp
      on lp.lesson_id = cl.id and lp.student_id = p_student_id and lp.completed = true
    where lp.lesson_id is null
  )
  and exists (select 1 from public.course_lessons);
$$;

revoke all on function public.has_completed_all_modules(uuid) from public;

-- ---------------------------------------------------------------------------
-- Helper: ranking
-- ---------------------------------------------------------------------------
create or replace function public.rank_for(p_score int, p_duration int, p_submitted_at timestamptz)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int + 1
  from public.final_assessment_attempts a
  where a.submitted_at is not null
    and (
      a.score > p_score
      or (a.score = p_score and a.duration_seconds < p_duration)
      or (a.score = p_score and a.duration_seconds = p_duration and a.submitted_at < p_submitted_at)
    );
$$;

revoke all on function public.rank_for(int, int, timestamptz) from public;

-- ---------------------------------------------------------------------------
-- Helper: nombor sijil
-- ---------------------------------------------------------------------------
create or replace function public.next_certificate_number()
returns text
language sql
security definer
set search_path = public
as $$
  select 'SMK-' || to_char(now(), 'YYYY') || '-' ||
         lpad(nextval('public.certificate_seq')::text, 5, '0');
$$;

revoke all on function public.next_certificate_number() from public;

-- ---------------------------------------------------------------------------
-- Lengkapkan profil
-- ---------------------------------------------------------------------------
create or replace function public.complete_profile(p_full_name text, p_class_name text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := trim(coalesce(p_full_name, ''));
  v_class text := trim(coalesce(p_class_name, ''));
  v_profile public.profiles;
begin
  if auth.uid() is null then
    raise exception 'Sesi tamat. Sila log masuk semula.';
  end if;

  if length(v_name) < 3
     or v_name !~ '^[A-Za-zÀ-ÖØ-öø-ÿ'' .-]+$'
     or array_length(regexp_split_to_array(v_name, '\s+'), 1) < 2 then
    raise exception 'Sila masukkan nama penuh (contoh: Ahmad bin Abdullah).';
  end if;

  if length(v_class) < 2 or length(v_class) > 30
     or v_class !~ '^[A-Za-z0-9][A-Za-z0-9 .''-]*$' then
    raise exception 'Sila masukkan kelas yang sah (contoh: 1 Amanah).';
  end if;

  update public.profiles
     set full_name = v_name,
         class_name = v_class,
         profile_completed = true,
         updated_at = now()
   where id = auth.uid()
   returning * into v_profile;

  perform public.enqueue_sheet_sync('PROFILE_UPDATED', jsonb_build_object(
    'student_id', v_profile.id,
    'student_name', v_profile.full_name,
    'class_name', v_profile.class_name,
    'email', v_profile.email,
    'profile_completed', v_profile.profile_completed,
    'updated_at', now()
  ));

  return jsonb_build_object(
    'id', v_profile.id,
    'email', v_profile.email,
    'full_name', v_profile.full_name,
    'class_name', v_profile.class_name,
    'role', v_profile.role,
    'profile_completed', v_profile.profile_completed
  );
end;
$$;

revoke all on function public.complete_profile(text, text) from public;
grant execute on function public.complete_profile(text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Tanda slaid dilihat
-- ---------------------------------------------------------------------------
create or replace function public.mark_slide_viewed(p_lesson_id text, p_slide_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lesson public.course_lessons;
  v_result jsonb;
begin
  if auth.uid() is null then
    raise exception 'Sesi tamat.';
  end if;

  select * into v_lesson from public.course_lessons where id = p_lesson_id;
  if not found then
    raise exception 'Modul tidak dijumpai.';
  end if;
  if not (p_slide_id = any(v_lesson.slide_ids)) then
    raise exception 'Slaid tidak sah.';
  end if;

  insert into public.slide_progress (student_id, lesson_id, slide_id, viewed_at)
  values (auth.uid(), p_lesson_id, p_slide_id, now())
  on conflict (student_id, slide_id) do nothing;

  v_result := public.recalc_lesson_progress(auth.uid(), p_lesson_id);
  return v_result;
end;
$$;

revoke all on function public.mark_slide_viewed(text, text) from public;
grant execute on function public.mark_slide_viewed(text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Dashboard pelajar
-- ---------------------------------------------------------------------------
create or replace function public.get_dashboard()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles;
  v_lessons jsonb;
  v_total_lessons int;
  v_completed_lessons int;
  v_course_pct int;
  v_attempt public.final_assessment_attempts;
  v_final jsonb;
  v_cert jsonb;
  v_all_complete boolean;
  v_rank int;
begin
  if auth.uid() is null then
    raise exception 'Sesi tamat.';
  end if;

  select * into v_profile from public.profiles where id = auth.uid();
  if not found then
    raise exception 'Profil tidak dijumpai.';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'lesson_id', t.id,
           'title', t.title,
           'order', t."order",
           'total_slides', t.total_slides,
           'slides_viewed', t.slides_viewed,
           'percentage', t.percentage,
           'quiz_passed', t.quiz_passed,
           'completed', t.completed
         ) order by t."order"), '[]'::jsonb)
    into v_lessons
  from (
    select cl.id, cl.title, cl."order", cl.total_slides,
           coalesce(lp.slides_viewed, 0) as slides_viewed,
           case when cl.total_slides = 0 then 0
                else round(coalesce(lp.slides_viewed, 0)::numeric / cl.total_slides * 100)::int
           end as percentage,
           exists(
             select 1 from public.quiz_attempts qa
             where qa.student_id = auth.uid() and qa.quiz_id = cl.quiz_id and qa.passed = true
           ) as quiz_passed,
           coalesce(lp.completed, false) as completed
    from public.course_lessons cl
    left join public.lesson_progress lp
      on lp.lesson_id = cl.id and lp.student_id = auth.uid()
  ) t;

  select count(*) into v_total_lessons from public.course_lessons;
  select count(*) into v_completed_lessons
  from public.lesson_progress
  where student_id = auth.uid() and completed = true;
  v_course_pct := case when v_total_lessons = 0 then 0
                       else round(v_completed_lessons::numeric / v_total_lessons * 100)::int end;

  v_all_complete := public.has_completed_all_modules(auth.uid());

  select * into v_attempt
  from public.final_assessment_attempts
  where student_id = auth.uid();

  if v_attempt.id is null then
    if v_all_complete then
      v_final := jsonb_build_object('status', 'READY');
    else
      v_final := jsonb_build_object('status', 'LOCKED', 'locked_reason', 'Selesaikan semua modul dahulu.');
    end if;
  elsif v_attempt.submitted_at is not null then
    v_rank := public.rank_for(v_attempt.score, v_attempt.duration_seconds, v_attempt.submitted_at);
    v_final := jsonb_build_object(
      'status', 'SUBMITTED',
      'attempt_id', v_attempt.id,
      'started_at', v_attempt.started_at,
      'submitted_at', v_attempt.submitted_at,
      'duration_seconds', v_attempt.duration_seconds,
      'score', v_attempt.score,
      'total', v_attempt.total,
      'percentage', v_attempt.percentage,
      'certificate_number', v_attempt.certificate_number,
      'rank', v_rank
    );
  else
    v_final := jsonb_build_object(
      'status', 'IN_PROGRESS',
      'attempt_id', v_attempt.id,
      'started_at', v_attempt.started_at,
      'total', v_attempt.total
    );
  end if;

  select jsonb_build_object(
           'certificate_number', c.certificate_number,
           'student_name', c.student_name,
           'class_name', c.class_name,
           'issued_at', c.issued_at,
           'score', c.score,
           'total', c.total,
           'duration_seconds', c.duration_seconds
         )
    into v_cert
  from public.certificates c
  where c.student_id = auth.uid();

  return jsonb_build_object(
    'profile', jsonb_build_object(
      'id', v_profile.id,
      'email', v_profile.email,
      'full_name', v_profile.full_name,
      'class_name', v_profile.class_name,
      'role', v_profile.role,
      'profile_completed', v_profile.profile_completed,
      'created_at', v_profile.created_at
    ),
    'lessons', v_lessons,
    'completed_lessons', v_completed_lessons,
    'total_lessons', v_total_lessons,
    'course_percentage', v_course_pct,
    'final', v_final,
    'certificate', v_cert
  );
end;
$$;

revoke all on function public.get_dashboard() from public;
grant execute on function public.get_dashboard() to authenticated;

-- ---------------------------------------------------------------------------
-- Hantar kuiz modul
-- ---------------------------------------------------------------------------
create or replace function public.submit_quiz(p_quiz_id text, p_answers jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles;
  v_quiz public.course_quizzes;
  v_score int;
  v_total int;
  v_pct int;
  v_passed boolean;
  v_attempt_id uuid;
  v_review jsonb;
  v_progress jsonb;
begin
  if auth.uid() is null then
    raise exception 'Sesi tamat.';
  end if;
  if jsonb_typeof(p_answers) <> 'object' then
    raise exception 'Jawapan tidak sah.';
  end if;

  select * into v_profile from public.profiles where id = auth.uid();
  if not found then raise exception 'Profil tidak dijumpai.'; end if;
  if not v_profile.profile_completed then raise exception 'Lengkapkan profil terlebih dahulu.'; end if;

  select * into v_quiz from public.course_quizzes where id = p_quiz_id;
  if not found or v_quiz.kind <> 'MODULE' then
    raise exception 'Kuiz tidak dijumpai.';
  end if;

  if (select count(*) from jsonb_object_keys(p_answers)) <> v_quiz.question_count then
    raise exception 'Jawab semua % soalan.', v_quiz.question_count;
  end if;
  if exists (
    select 1 from public.question_keys qk
    where qk.quiz_id = p_quiz_id and not (p_answers ? qk.question_id)
  ) then
    raise exception 'Jawapan tidak lengkap.';
  end if;

  select coalesce(sum(qk.points) filter (where p_answers->>qk.question_id = qk.correct_answer), 0),
         coalesce(sum(qk.points), 0)
    into v_score, v_total
  from public.question_keys qk
  where qk.quiz_id = p_quiz_id;

  if v_total <= 0 then raise exception 'Kuiz belum mempunyai soalan.'; end if;
  v_pct := round(v_score::numeric / v_total * 100)::int;
  v_passed := v_pct >= v_quiz.passing_score;

  insert into public.quiz_attempts
    (student_id, quiz_id, score, total, percentage, passed, answers, completed_at)
  values
    (auth.uid(), p_quiz_id, v_score, v_total, v_pct, v_passed, p_answers, now())
  returning id into v_attempt_id;

  v_progress := public.recalc_lesson_progress(auth.uid(), v_quiz.lesson_id);

  select jsonb_agg(jsonb_build_object(
           'question_id', qk.question_id,
           'correct_answer', qk.correct_answer,
           'explanation', qk.explanation,
           'given', coalesce(p_answers->>qk.question_id, ''),
           'is_correct', (p_answers->>qk.question_id = qk.correct_answer)
         ) order by qk.question_id)
    into v_review
  from public.question_keys qk
  where qk.quiz_id = p_quiz_id;

  perform public.enqueue_sheet_sync('QUIZ_ATTEMPT', jsonb_build_object(
    'attempt_id', v_attempt_id,
    'student_id', auth.uid(),
    'student_name', v_profile.full_name,
    'class_name', v_profile.class_name,
    'email', v_profile.email,
    'quiz_id', p_quiz_id,
    'quiz_title', v_quiz.title,
    'score', v_score,
    'total', v_total,
    'percentage', v_pct,
    'passed', v_passed,
    'completed_at', now()
  ));

  return jsonb_build_object(
    'score', v_score,
    'total', v_total,
    'percentage', v_pct,
    'passed', v_passed,
    'passing_score', v_quiz.passing_score,
    'review', coalesce(v_review, '[]'::jsonb),
    'lesson_completed', coalesce((v_progress->>'completed')::boolean, false)
  );
end;
$$;

revoke all on function public.submit_quiz(text, jsonb) from public;
grant execute on function public.submit_quiz(text, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- Mula / sambung pentaksiran akhir
-- ---------------------------------------------------------------------------
create or replace function public.start_final_assessment()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles;
  v_quiz public.course_quizzes;
  v_attempt public.final_assessment_attempts;
  v_rank int;
begin
  if auth.uid() is null then raise exception 'Sesi tamat.'; end if;

  select * into v_profile from public.profiles where id = auth.uid();
  if not found then raise exception 'Profil tidak dijumpai.'; end if;
  if not v_profile.profile_completed or v_profile.full_name is null or v_profile.class_name is null then
    raise exception 'Lengkapkan nama penuh dan kelas terlebih dahulu.';
  end if;

  if not public.has_completed_all_modules(auth.uid()) then
    raise exception 'Selesaikan semua modul dahulu sebelum pentaksiran akhir.';
  end if;

  select * into v_quiz from public.course_quizzes where kind = 'FINAL' limit 1;
  if not found then raise exception 'Pentaksiran akhir belum disediakan.'; end if;

  select * into v_attempt
  from public.final_assessment_attempts
  where student_id = auth.uid()
  for update;

  if found then
    if v_attempt.submitted_at is not null then
      v_rank := public.rank_for(v_attempt.score, v_attempt.duration_seconds, v_attempt.submitted_at);
      return jsonb_build_object(
        'status', 'SUBMITTED',
        'attempt_id', v_attempt.id,
        'started_at', v_attempt.started_at,
        'submitted_at', v_attempt.submitted_at,
        'duration_seconds', v_attempt.duration_seconds,
        'score', v_attempt.score,
        'total', v_attempt.total,
        'percentage', v_attempt.percentage,
        'certificate_number', v_attempt.certificate_number,
        'rank', v_rank
      );
    end if;
    return jsonb_build_object(
      'status', 'IN_PROGRESS',
      'attempt_id', v_attempt.id,
      'started_at', v_attempt.started_at,
      'total', v_attempt.total
    );
  end if;

  insert into public.final_assessment_attempts (student_id, started_at, total)
  values (auth.uid(), now(), v_quiz.question_count)
  returning * into v_attempt;

  return jsonb_build_object(
    'status', 'IN_PROGRESS',
    'attempt_id', v_attempt.id,
    'started_at', v_attempt.started_at,
    'total', v_attempt.total
  );
end;
$$;

revoke all on function public.start_final_assessment() from public;
grant execute on function public.start_final_assessment() to authenticated;

-- ---------------------------------------------------------------------------
-- Hantar pentaksiran akhir (SATU percubaan; sijil tanpa kira markah)
-- ---------------------------------------------------------------------------
create or replace function public.submit_final_assessment(p_answers jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles;
  v_quiz public.course_quizzes;
  v_attempt public.final_assessment_attempts;
  v_score int;
  v_total int;
  v_pct int;
  v_duration int;
  v_submitted_at timestamptz := now();
  v_cert text;
  v_rank int;
  v_review jsonb;
begin
  if auth.uid() is null then raise exception 'Sesi tamat.'; end if;
  if jsonb_typeof(p_answers) <> 'object' then raise exception 'Jawapan tidak sah.'; end if;

  select * into v_profile from public.profiles where id = auth.uid();
  if not found then raise exception 'Profil tidak dijumpai.'; end if;
  if not v_profile.profile_completed or v_profile.full_name is null or v_profile.class_name is null then
    raise exception 'Lengkapkan nama penuh dan kelas terlebih dahulu.';
  end if;

  select * into v_attempt
  from public.final_assessment_attempts
  where student_id = auth.uid()
  for update;
  if not found then raise exception 'Sila mula pentaksiran terlebih dahulu.'; end if;
  if v_attempt.submitted_at is not null then
    raise exception 'Anda sudah menjawab pentaksiran ini. Hanya satu percubaan dibenarkan.';
  end if;

  select * into v_quiz from public.course_quizzes where kind = 'FINAL' limit 1;
  if not found then raise exception 'Pentaksiran akhir belum disediakan.'; end if;

  if (select count(*) from jsonb_object_keys(p_answers)) <> v_quiz.question_count then
    raise exception 'Jawab semua % soalan.', v_quiz.question_count;
  end if;
  if exists (
    select 1 from public.question_keys qk
    where qk.quiz_id = v_quiz.id and not (p_answers ? qk.question_id)
  ) then
    raise exception 'Jawapan tidak lengkap.';
  end if;

  select coalesce(sum(qk.points) filter (where p_answers->>qk.question_id = qk.correct_answer), 0),
         coalesce(sum(qk.points), 0)
    into v_score, v_total
  from public.question_keys qk
  where qk.quiz_id = v_quiz.id;

  if v_total <= 0 then raise exception 'Pentaksiran belum mempunyai soalan.'; end if;
  v_pct := round(v_score::numeric / v_total * 100)::int;
  v_duration := greatest(0, extract(epoch from (v_submitted_at - v_attempt.started_at))::int);

  update public.final_assessment_attempts
     set submitted_at = v_submitted_at,
         duration_seconds = v_duration,
         score = v_score,
         total = v_total,
         percentage = v_pct,
         answers = p_answers
   where id = v_attempt.id;

  insert into public.certificates
    (certificate_number, student_id, student_name, class_name, issued_at, score, total, duration_seconds)
  values
    (public.next_certificate_number(), auth.uid(), v_profile.full_name, v_profile.class_name, v_submitted_at, v_score, v_total, v_duration)
  on conflict (student_id) do nothing;

  select certificate_number into v_cert
  from public.certificates
  where student_id = auth.uid();

  update public.final_assessment_attempts
     set certificate_number = v_cert
   where id = v_attempt.id;

  v_rank := public.rank_for(v_score, v_duration, v_submitted_at);

  select jsonb_agg(jsonb_build_object(
           'question_id', qk.question_id,
           'correct_answer', qk.correct_answer,
           'explanation', qk.explanation,
           'given', coalesce(p_answers->>qk.question_id, ''),
           'is_correct', (p_answers->>qk.question_id = qk.correct_answer)
         ) order by qk.question_id)
    into v_review
  from public.question_keys qk
  where qk.quiz_id = v_quiz.id;

  perform public.enqueue_sheet_sync('FINAL_SUBMITTED', jsonb_build_object(
    'attempt_id', v_attempt.id,
    'student_id', auth.uid(),
    'student_name', v_profile.full_name,
    'class_name', v_profile.class_name,
    'email', v_profile.email,
    'score', v_score,
    'total', v_total,
    'percentage', v_pct,
    'duration_seconds', v_duration,
    'certificate_number', v_cert,
    'rank', v_rank,
    'submitted_at', v_submitted_at
  ));

  return jsonb_build_object(
    'score', v_score,
    'total', v_total,
    'percentage', v_pct,
    'duration_seconds', v_duration,
    'certificate_number', v_cert,
    'rank', v_rank,
    'review', coalesce(v_review, '[]'::jsonb)
  );
end;
$$;

revoke all on function public.submit_final_assessment(jsonb) from public;
grant execute on function public.submit_final_assessment(jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- Papan ranking
-- ---------------------------------------------------------------------------
create or replace function public.get_leaderboard()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_top jsonb;
  v_me jsonb;
begin
  if auth.uid() is null then raise exception 'Sesi tamat.'; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'rank', t.rank,
           'student_id', t.student_id,
           'full_name', t.full_name,
           'class_name', t.class_name,
           'score', t.score,
           'total', t.total,
           'percentage', t.percentage,
           'duration_seconds', t.duration_seconds,
           'submitted_at', t.submitted_at
         ) order by t.rank), '[]'::jsonb)
    into v_top
  from (
    select row_number() over (order by a.score desc, a.duration_seconds asc, a.submitted_at asc) as rank,
           a.student_id, p.full_name, p.class_name, a.score, a.total,
           a.percentage, a.duration_seconds, a.submitted_at
    from public.final_assessment_attempts a
    join public.profiles p on p.id = a.student_id
    where a.submitted_at is not null
    order by a.score desc, a.duration_seconds asc, a.submitted_at asc
    limit 20
  ) t;

  select jsonb_build_object(
           'rank', t.rank,
           'student_id', t.student_id,
           'full_name', t.full_name,
           'class_name', t.class_name,
           'score', t.score,
           'total', t.total,
           'percentage', t.percentage,
           'duration_seconds', t.duration_seconds,
           'submitted_at', t.submitted_at,
           'is_me', true
         )
    into v_me
  from (
    select row_number() over (order by a.score desc, a.duration_seconds asc, a.submitted_at asc) as rank,
           a.student_id, p.full_name, p.class_name, a.score, a.total,
           a.percentage, a.duration_seconds, a.submitted_at
    from public.final_assessment_attempts a
    join public.profiles p on p.id = a.student_id
    where a.submitted_at is not null
  ) t
  where t.student_id = auth.uid();

  return jsonb_build_object('top', v_top, 'me', v_me);
end;
$$;

revoke all on function public.get_leaderboard() from public;
grant execute on function public.get_leaderboard() to authenticated;

-- ---------------------------------------------------------------------------
-- Semakan jawapan pentaksiran akhir (selepas hantar)
-- ---------------------------------------------------------------------------
create or replace function public.get_final_review()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quiz public.course_quizzes;
  v_answers jsonb;
  v_review jsonb;
begin
  if auth.uid() is null then raise exception 'Sesi tamat.'; end if;

  select * into v_quiz from public.course_quizzes where kind = 'FINAL' limit 1;
  if not found then return '[]'::jsonb; end if;

  select answers into v_answers
  from public.final_assessment_attempts
  where student_id = auth.uid() and submitted_at is not null;

  if v_answers is null then return '[]'::jsonb; end if;

  select jsonb_agg(jsonb_build_object(
           'question_id', qk.question_id,
           'correct_answer', qk.correct_answer,
           'explanation', qk.explanation,
           'given', coalesce(v_answers->>qk.question_id, ''),
           'is_correct', (v_answers->>qk.question_id = qk.correct_answer)
         ) order by qk.question_id)
    into v_review
  from public.question_keys qk
  where qk.quiz_id = v_quiz.id;

  return coalesce(v_review, '[]'::jsonb);
end;
$$;

revoke all on function public.get_final_review() from public;
grant execute on function public.get_final_review() to authenticated;

-- ---------------------------------------------------------------------------
-- Sijil
-- ---------------------------------------------------------------------------
create or replace function public.get_my_certificate()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'certificate_number', certificate_number,
    'student_name', student_name,
    'class_name', class_name,
    'issued_at', issued_at,
    'score', score,
    'total', total,
    'duration_seconds', duration_seconds
  )
  from public.certificates
  where student_id = auth.uid();
$$;

revoke all on function public.get_my_certificate() from public;
grant execute on function public.get_my_certificate() to authenticated;

create or replace function public.verify_certificate(p_number text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select jsonb_build_object(
       'valid', true,
       'certificate_number', c.certificate_number,
       'student_name', coalesce(c.student_name, p.full_name),
       'class_name', coalesce(c.class_name, p.class_name),
       'issued_at', c.issued_at,
       'score', c.score,
       'total', c.total,
       'duration_seconds', c.duration_seconds
     )
     from public.certificates c
     join public.profiles p on p.id = c.student_id
     where c.certificate_number = upper(trim(p_number))),
    jsonb_build_object('valid', false)
  );
$$;

revoke all on function public.verify_certificate(text) from public;
grant execute on function public.verify_certificate(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Admin
-- ---------------------------------------------------------------------------
create or replace function public.admin_stats()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if not public.is_admin() then raise exception 'Tiada kebenaran.'; end if;

  select jsonb_build_object(
    'students', (select count(*) from public.profiles where role = 'STUDENT'),
    'completed_profiles', (select count(*) from public.profiles where role = 'STUDENT' and profile_completed = true),
    'final_submitted', (select count(*) from public.final_assessment_attempts where submitted_at is not null),
    'certificates', (select count(*) from public.certificates),
    'average_progress', coalesce((
      select round(avg(coalesce(lp.cnt, 0)) * 100.0 / nullif((select count(*) from public.course_lessons), 0))::int
      from public.profiles p
      left join (
        select student_id, count(*) filter (where completed = true) as cnt
        from public.lesson_progress group by student_id
      ) lp on lp.student_id = p.id
      where p.role = 'STUDENT'
    ), 0)
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.admin_stats() from public;
grant execute on function public.admin_stats() to authenticated;

create or replace function public.admin_list_students()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if not public.is_admin() then raise exception 'Tiada kebenaran.'; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'id', p.id,
           'email', p.email,
           'full_name', p.full_name,
           'class_name', p.class_name,
           'profile_completed', p.profile_completed,
           'created_at', p.created_at,
           'completed_lessons', coalesce(lp.cnt, 0),
           'total_lessons', (select count(*) from public.course_lessons),
           'final_score', fa.score,
           'final_total', fa.total,
           'final_duration', fa.duration_seconds,
           'final_submitted_at', fa.submitted_at,
           'certificate_number', c.certificate_number
         ) order by p.created_at desc), '[]'::jsonb)
    into v_result
  from public.profiles p
  left join (
    select student_id, count(*) filter (where completed = true) as cnt
    from public.lesson_progress group by student_id
  ) lp on lp.student_id = p.id
  left join public.final_assessment_attempts fa
    on fa.student_id = p.id and fa.submitted_at is not null
  left join public.certificates c on c.student_id = p.id
  where p.role = 'STUDENT';

  return v_result;
end;
$$;

revoke all on function public.admin_list_students() from public;
grant execute on function public.admin_list_students() to authenticated;

create or replace function public.admin_student_detail(p_student_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles;
  v_lessons jsonb;
  v_attempts jsonb;
  v_final jsonb;
  v_cert jsonb;
begin
  if not public.is_admin() then raise exception 'Tiada kebenaran.'; end if;

  select * into v_profile from public.profiles where id = p_student_id and role = 'STUDENT';
  if not found then raise exception 'Pelajar tidak dijumpai.'; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'lesson_id', cl.id,
           'title', cl.title,
           'order', cl."order",
           'total_slides', cl.total_slides,
           'slides_viewed', coalesce(lp.slides_viewed, 0),
           'percentage', case when cl.total_slides = 0 then 0
                              else round(coalesce(lp.slides_viewed, 0)::numeric / cl.total_slides * 100)::int end,
           'completed', coalesce(lp.completed, false),
           'completed_at', lp.completed_at
         ) order by cl."order"), '[]'::jsonb)
    into v_lessons
  from public.course_lessons cl
  left join public.lesson_progress lp
    on lp.lesson_id = cl.id and lp.student_id = p_student_id;

  select coalesce(jsonb_agg(jsonb_build_object(
           'id', qa.id,
           'quiz_id', qa.quiz_id,
           'score', qa.score,
           'total', qa.total,
           'percentage', qa.percentage,
           'passed', qa.passed,
           'completed_at', qa.completed_at
         ) order by qa.completed_at desc), '[]'::jsonb)
    into v_attempts
  from public.quiz_attempts qa
  where qa.student_id = p_student_id;

  select jsonb_build_object(
           'started_at', fa.started_at,
           'submitted_at', fa.submitted_at,
           'duration_seconds', fa.duration_seconds,
           'score', fa.score,
           'total', fa.total,
           'percentage', fa.percentage,
           'certificate_number', fa.certificate_number,
           'rank', case when fa.submitted_at is not null
                        then public.rank_for(fa.score, fa.duration_seconds, fa.submitted_at)
                        else null end
         )
    into v_final
  from public.final_assessment_attempts fa
  where fa.student_id = p_student_id;

  select jsonb_build_object(
           'certificate_number', c.certificate_number,
           'student_name', c.student_name,
           'class_name', c.class_name,
           'issued_at', c.issued_at,
           'score', c.score,
           'total', c.total,
           'duration_seconds', c.duration_seconds
         )
    into v_cert
  from public.certificates c
  where c.student_id = p_student_id;

  return jsonb_build_object(
    'profile', jsonb_build_object(
      'id', v_profile.id,
      'email', v_profile.email,
      'full_name', v_profile.full_name,
      'class_name', v_profile.class_name,
      'profile_completed', v_profile.profile_completed,
      'created_at', v_profile.created_at
    ),
    'lessons', v_lessons,
    'attempts', v_attempts,
    'final', v_final,
    'certificate', v_cert
  );
end;
$$;

revoke all on function public.admin_student_detail(uuid) from public;
grant execute on function public.admin_student_detail(uuid) to authenticated;

create or replace function public.admin_list_attempts()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_modules jsonb;
  v_finals jsonb;
begin
  if not public.is_admin() then raise exception 'Tiada kebenaran.'; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'id', qa.id,
           'student_id', qa.student_id,
           'student_name', p.full_name,
           'class_name', p.class_name,
           'email', p.email,
           'quiz_id', qa.quiz_id,
           'quiz_title', coalesce(q.title, qa.quiz_id),
           'score', qa.score,
           'total', qa.total,
           'percentage', qa.percentage,
           'passed', qa.passed,
           'completed_at', qa.completed_at
         ) order by qa.completed_at desc), '[]'::jsonb)
    into v_modules
  from public.quiz_attempts qa
  join public.profiles p on p.id = qa.student_id
  left join public.course_quizzes q on q.id = qa.quiz_id;

  select coalesce(jsonb_agg(jsonb_build_object(
           'id', fa.id,
           'student_id', fa.student_id,
           'student_name', p.full_name,
           'class_name', p.class_name,
           'email', p.email,
           'score', fa.score,
           'total', fa.total,
           'percentage', fa.percentage,
           'duration_seconds', fa.duration_seconds,
           'certificate_number', fa.certificate_number,
           'submitted_at', fa.submitted_at
         ) order by fa.submitted_at desc), '[]'::jsonb)
    into v_finals
  from public.final_assessment_attempts fa
  join public.profiles p on p.id = fa.student_id
  where fa.submitted_at is not null;

  return jsonb_build_object('module_attempts', v_modules, 'final_attempts', v_finals);
end;
$$;

revoke all on function public.admin_list_attempts() from public;
grant execute on function public.admin_list_attempts() to authenticated;

create or replace function public.admin_list_certificates()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if not public.is_admin() then raise exception 'Tiada kebenaran.'; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'certificate_number', c.certificate_number,
           'student_id', c.student_id,
           'student_name', coalesce(c.student_name, p.full_name),
           'class_name', coalesce(c.class_name, p.class_name),
           'email', p.email,
           'issued_at', c.issued_at,
           'score', c.score,
           'total', c.total,
           'duration_seconds', c.duration_seconds
         ) order by c.issued_at desc), '[]'::jsonb)
    into v_result
  from public.certificates c
  join public.profiles p on p.id = c.student_id;

  return v_result;
end;
$$;

revoke all on function public.admin_list_certificates() from public;
grant execute on function public.admin_list_certificates() to authenticated;

create or replace function public.admin_leaderboard()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if not public.is_admin() then raise exception 'Tiada kebenaran.'; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'rank', t.rank,
           'student_id', t.student_id,
           'full_name', t.full_name,
           'class_name', t.class_name,
           'score', t.score,
           'total', t.total,
           'percentage', t.percentage,
           'duration_seconds', t.duration_seconds,
           'submitted_at', t.submitted_at
         ) order by t.rank), '[]'::jsonb)
    into v_result
  from (
    select row_number() over (order by a.score desc, a.duration_seconds asc, a.submitted_at asc) as rank,
           a.student_id, p.full_name, p.class_name, a.score, a.total,
           a.percentage, a.duration_seconds, a.submitted_at
    from public.final_assessment_attempts a
    join public.profiles p on p.id = a.student_id
    where a.submitted_at is not null
    order by a.score desc, a.duration_seconds asc, a.submitted_at asc
  ) t;

  return v_result;
end;
$$;

revoke all on function public.admin_leaderboard() from public;
grant execute on function public.admin_leaderboard() to authenticated;

-- ---------------------------------------------------------------------------
-- Tetapan & sync Google Sheets
-- ---------------------------------------------------------------------------
create or replace function public.get_sheet_settings()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url text;
  v_secret text;
begin
  if not public.is_admin() then raise exception 'Tiada kebenaran.'; end if;
  select value into v_url from public.app_settings where key = 'sheet_webhook_url';
  select value into v_secret from public.app_settings where key = 'sheet_webhook_secret';
  return jsonb_build_object('url', coalesce(v_url, ''), 'has_secret', coalesce(length(v_secret), 0) > 0);
end;
$$;

revoke all on function public.get_sheet_settings() from public;
grant execute on function public.get_sheet_settings() to authenticated;

create or replace function public.set_sheet_webhook(p_url text, p_secret text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Tiada kebenaran.'; end if;

  insert into public.app_settings (key, value)
  values ('sheet_webhook_url', trim(coalesce(p_url, '')))
  on conflict (key) do update set value = excluded.value;

  if p_secret is not null then
    insert into public.app_settings (key, value)
    values ('sheet_webhook_secret', p_secret)
    on conflict (key) do update set value = excluded.value;
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.set_sheet_webhook(text, text) from public;
grant execute on function public.set_sheet_webhook(text, text) to authenticated;

create or replace function public.enqueue_sheet_sync(p_event text, p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_url text;
  v_secret text;
begin
  insert into public.sheet_sync_queue (event_type, payload)
  values (p_event, p_payload)
  returning id into v_id;

  select value into v_url from public.app_settings where key = 'sheet_webhook_url';
  select value into v_secret from public.app_settings where key = 'sheet_webhook_secret';

  if v_url is null or v_url = '' then
    return jsonb_build_object('ok', false, 'error', 'URL webhook Google Sheets belum ditetapkan.');
  end if;

  begin
    perform net.http_post(
      url := v_url,
      body := jsonb_build_object('secret', coalesce(v_secret, ''), 'event', p_event, 'payload', p_payload),
      headers := jsonb_build_object('Content-Type', 'application/json'),
      timeout_milliseconds := 15000
    );
    update public.sheet_sync_queue
       set status = 'SENT', sent_at = now(), attempts = attempts + 1
     where id = v_id;
    return jsonb_build_object('ok', true);
  exception when others then
    update public.sheet_sync_queue
       set status = 'FAILED', attempts = attempts + 1, last_error = sqlerrm
     where id = v_id;
    return jsonb_build_object('ok', false, 'error', sqlerrm);
  end;
end;
$$;

revoke all on function public.enqueue_sheet_sync(text, jsonb) from public, anon, authenticated;

create or replace function public.sync_all_sheets()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_students jsonb;
  v_attempts jsonb;
  v_certs jsonb;
  v_ranking jsonb;
  v_url text;
  v_status jsonb;
begin
  if not public.is_admin() then raise exception 'Tiada kebenaran.'; end if;

  v_students := public.admin_list_students();
  v_attempts := public.admin_list_attempts();
  v_certs := public.admin_list_certificates();
  v_ranking := public.admin_leaderboard();

  select value into v_url from public.app_settings where key = 'sheet_webhook_url';
  if v_url is null or v_url = '' then
    raise exception 'URL webhook Google Sheets belum ditetapkan.';
  end if;

  v_status := public.enqueue_sheet_sync('FULL_SYNC', jsonb_build_object(
    'students', v_students,
    'module_attempts', v_attempts->'module_attempts',
    'final_attempts', v_attempts->'final_attempts',
    'certificates', v_certs,
    'ranking', v_ranking,
    'generated_at', now()
  ));

  return v_status;
end;
$$;

revoke all on function public.sync_all_sheets() from public;
grant execute on function public.sync_all_sheets() to authenticated;


-- ==================== 003_seed.sql ====================

-- ============================================================================
-- AUTO-GENERATED oleh scripts/generate-answer-keys.mjs
-- Jalankan selepas 001_schema.sql dan 002_rpc.sql.
-- ============================================================================

-- Bersihkan metadata kursus lama (kemajuan pelajar tidak dipadam).
delete from public.course_quizzes;
delete from public.course_lessons;
delete from public.question_keys;

-- Metadata modul
insert into public.course_lessons (id, title, "order", total_slides, quiz_id, slide_ids) values ('modul-1-pengenalan-dalil', 'Modul 1: Pengenalan, Maksud dan Dalil Kewajipan Solat', 1, 6, 'quiz-m1', array['m1-s1', 'm1-s2', 'm1-s3', 'm1-s4', 'm1-s5', 'm1-s6']::text[]) on conflict (id) do update set title = excluded.title, "order" = excluded."order", total_slides = excluded.total_slides, quiz_id = excluded.quiz_id, slide_ids = excluded.slide_ids;
insert into public.course_lessons (id, title, "order", total_slides, quiz_id, slide_ids) values ('modul-2-syarat-pembatal', 'Modul 2: Syarat Wajib, Syarat Sah dan Perkara yang Membatalkan Solat', 2, 5, 'quiz-m2', array['m2-s1', 'm2-s2', 'm2-s3', 'm2-s4', 'm2-s5']::text[]) on conflict (id) do update set title = excluded.title, "order" = excluded."order", total_slides = excluded.total_slides, quiz_id = excluded.quiz_id, slide_ids = excluded.slide_ids;
insert into public.course_lessons (id, title, "order", total_slides, quiz_id, slide_ids) values ('modul-3-rukun', 'Modul 3: Rukun-Rukun Solat', 3, 6, 'quiz-m3', array['m3-s1', 'm3-s2', 'm3-s3', 'm3-s4', 'm3-s5', 'm3-s6']::text[]) on conflict (id) do update set title = excluded.title, "order" = excluded."order", total_slides = excluded.total_slides, quiz_id = excluded.quiz_id, slide_ids = excluded.slide_ids;
insert into public.course_lessons (id, title, "order", total_slides, quiz_id, slide_ids) values ('modul-4-sunat-ab-ad-hai-at', 'Modul 4: Sunat Ab''ad dan Sunat Hai''at', 4, 5, 'quiz-m4', array['m4-s1', 'm4-s2', 'm4-s3', 'm4-s4', 'm4-s5']::text[]) on conflict (id) do update set title = excluded.title, "order" = excluded."order", total_slides = excluded.total_slides, quiz_id = excluded.quiz_id, slide_ids = excluded.slide_ids;
insert into public.course_lessons (id, title, "order", total_slides, quiz_id, slide_ids) values ('modul-5-akibat-hikmah', 'Modul 5: Akibat Meninggalkan Solat dan Hikmah Solat', 5, 5, 'quiz-m5', array['m5-s1', 'm5-s2', 'm5-s3', 'm5-s4', 'm5-s5']::text[]) on conflict (id) do update set title = excluded.title, "order" = excluded."order", total_slides = excluded.total_slides, quiz_id = excluded.quiz_id, slide_ids = excluded.slide_ids;
insert into public.course_lessons (id, title, "order", total_slides, quiz_id, slide_ids) values ('modul-6-sains', 'Modul 6: Kelebihan Solat dari Sudut Sains', 6, 5, 'quiz-m6', array['m6-s1', 'm6-s2', 'm6-s3', 'm6-s4', 'm6-s5']::text[]) on conflict (id) do update set title = excluded.title, "order" = excluded."order", total_slides = excluded.total_slides, quiz_id = excluded.quiz_id, slide_ids = excluded.slide_ids;
insert into public.course_lessons (id, title, "order", total_slides, quiz_id, slide_ids) values ('modul-7-khusyuk', 'Modul 7: Khusyuk dalam Solat', 7, 6, 'quiz-m7', array['m7-s1', 'm7-s2', 'm7-s3', 'm7-s4', 'm7-s5', 'm7-s6']::text[]) on conflict (id) do update set title = excluded.title, "order" = excluded."order", total_slides = excluded.total_slides, quiz_id = excluded.quiz_id, slide_ids = excluded.slide_ids;

-- Metadata kuiz
insert into public.course_quizzes (id, lesson_id, title, kind, passing_score, question_count) values ('quiz-m1', 'modul-1-pengenalan-dalil', 'Kuiz Modul 1: Pengenalan dan Dalil Solat', 'MODULE', 80, 5) on conflict (id) do update set lesson_id = excluded.lesson_id, title = excluded.title, kind = excluded.kind, passing_score = excluded.passing_score, question_count = excluded.question_count;
insert into public.course_quizzes (id, lesson_id, title, kind, passing_score, question_count) values ('quiz-m2', 'modul-2-syarat-pembatal', 'Kuiz Modul 2: Syarat dan Pembatal Solat', 'MODULE', 80, 5) on conflict (id) do update set lesson_id = excluded.lesson_id, title = excluded.title, kind = excluded.kind, passing_score = excluded.passing_score, question_count = excluded.question_count;
insert into public.course_quizzes (id, lesson_id, title, kind, passing_score, question_count) values ('quiz-m3', 'modul-3-rukun', 'Kuiz Modul 3: Rukun Solat', 'MODULE', 80, 5) on conflict (id) do update set lesson_id = excluded.lesson_id, title = excluded.title, kind = excluded.kind, passing_score = excluded.passing_score, question_count = excluded.question_count;
insert into public.course_quizzes (id, lesson_id, title, kind, passing_score, question_count) values ('quiz-m4', 'modul-4-sunat-ab-ad-hai-at', 'Kuiz Modul 4: Sunat Ab''ad dan Hai''at', 'MODULE', 80, 5) on conflict (id) do update set lesson_id = excluded.lesson_id, title = excluded.title, kind = excluded.kind, passing_score = excluded.passing_score, question_count = excluded.question_count;
insert into public.course_quizzes (id, lesson_id, title, kind, passing_score, question_count) values ('quiz-m5', 'modul-5-akibat-hikmah', 'Kuiz Modul 5: Akibat dan Hikmah Solat', 'MODULE', 80, 5) on conflict (id) do update set lesson_id = excluded.lesson_id, title = excluded.title, kind = excluded.kind, passing_score = excluded.passing_score, question_count = excluded.question_count;
insert into public.course_quizzes (id, lesson_id, title, kind, passing_score, question_count) values ('quiz-m6', 'modul-6-sains', 'Kuiz Modul 6: Kelebihan Solat dari Sudut Sains', 'MODULE', 80, 5) on conflict (id) do update set lesson_id = excluded.lesson_id, title = excluded.title, kind = excluded.kind, passing_score = excluded.passing_score, question_count = excluded.question_count;
insert into public.course_quizzes (id, lesson_id, title, kind, passing_score, question_count) values ('quiz-m7', 'modul-7-khusyuk', 'Kuiz Modul 7: Khusyuk dalam Solat', 'MODULE', 80, 5) on conflict (id) do update set lesson_id = excluded.lesson_id, title = excluded.title, kind = excluded.kind, passing_score = excluded.passing_score, question_count = excluded.question_count;
insert into public.course_quizzes (id, lesson_id, title, kind, passing_score, question_count) values ('quiz-pentaksiran-akhir', null, 'Pentaksiran Akhir — 20 Soalan', 'FINAL', 0, 20) on conflict (id) do update set lesson_id = null, title = excluded.title, kind = 'FINAL', passing_score = 0, question_count = excluded.question_count;

-- Kunci jawapan kuiz modul
insert into public.question_keys (question_id, quiz_id, quiz_kind, correct_answer, points, explanation) values ('m1-q1', 'quiz-m1', 'MODULE', 'A', 1, 'Dari segi bahasa, solat bermaksud doa.') on conflict (question_id) do update set quiz_id = excluded.quiz_id, quiz_kind = excluded.quiz_kind, correct_answer = excluded.correct_answer, points = excluded.points, explanation = excluded.explanation;
insert into public.question_keys (question_id, quiz_id, quiz_kind, correct_answer, points, explanation) values ('m1-q2', 'quiz-m1', 'MODULE', 'A', 1, 'Solat difardukan pada malam Israk dan Mikraj, dua tahun sebelum hijrah.') on conflict (question_id) do update set quiz_id = excluded.quiz_id, quiz_kind = excluded.quiz_kind, correct_answer = excluded.correct_answer, points = excluded.points, explanation = excluded.explanation;
insert into public.question_keys (question_id, quiz_id, quiz_kind, correct_answer, points, explanation) values ('m1-q3', 'quiz-m1', 'MODULE', 'A', 1, 'Solat fardu lima waktu ialah tuntutan fardu ain ke atas setiap individu Muslim mukallaf.') on conflict (question_id) do update set quiz_id = excluded.quiz_id, quiz_kind = excluded.quiz_kind, correct_answer = excluded.correct_answer, points = excluded.points, explanation = excluded.explanation;
insert into public.question_keys (question_id, quiz_id, quiz_kind, correct_answer, points, explanation) values ('m1-q4', 'quiz-m1', 'MODULE', 'D', 1, 'Solat tidak boleh ditinggalkan; ia tiang agama dan amalan pertama yang dihitung.') on conflict (question_id) do update set quiz_id = excluded.quiz_id, quiz_kind = excluded.quiz_kind, correct_answer = excluded.correct_answer, points = excluded.points, explanation = excluded.explanation;
insert into public.question_keys (question_id, quiz_id, quiz_kind, correct_answer, points, explanation) values ('m1-q5', 'quiz-m1', 'MODULE', 'A', 1, 'Ayat 43 menyuruh mendirikan solat, menunaikan zakat dan rukuk bersama orang yang rukuk.') on conflict (question_id) do update set quiz_id = excluded.quiz_id, quiz_kind = excluded.quiz_kind, correct_answer = excluded.correct_answer, points = excluded.points, explanation = excluded.explanation;
insert into public.question_keys (question_id, quiz_id, quiz_kind, correct_answer, points, explanation) values ('m2-q1', 'quiz-m2', 'MODULE', 'A', 1, 'Syarat wajib solat: Islam, baligh, berakal, dan suci daripada haid serta nifas.') on conflict (question_id) do update set quiz_id = excluded.quiz_id, quiz_kind = excluded.quiz_kind, correct_answer = excluded.correct_answer, points = excluded.points, explanation = excluded.explanation;
insert into public.question_keys (question_id, quiz_id, quiz_kind, correct_answer, points, explanation) values ('m2-q2', 'quiz-m2', 'MODULE', 'A', 1, 'Terdapat 5 syarat sah solat.') on conflict (question_id) do update set quiz_id = excluded.quiz_id, quiz_kind = excluded.quiz_kind, correct_answer = excluded.correct_answer, points = excluded.points, explanation = excluded.explanation;
insert into public.question_keys (question_id, quiz_id, quiz_kind, correct_answer, points, explanation) values ('m2-q3', 'quiz-m2', 'MODULE', 'B', 1, 'Bercakap dengan sengaja walaupun sedikit membatalkan solat.') on conflict (question_id) do update set quiz_id = excluded.quiz_id, quiz_kind = excluded.quiz_kind, correct_answer = excluded.correct_answer, points = excluded.points, explanation = excluded.explanation;
insert into public.question_keys (question_id, quiz_id, quiz_kind, correct_answer, points, explanation) values ('m2-q4', 'quiz-m2', 'MODULE', 'B', 1, 'Perkara yang membatalkan solat ialah berhadas sebelum salam yang pertama. Selepas salam pertama, solat sudah sempurna.') on conflict (question_id) do update set quiz_id = excluded.quiz_id, quiz_kind = excluded.quiz_kind, correct_answer = excluded.correct_answer, points = excluded.points, explanation = excluded.explanation;
insert into public.question_keys (question_id, quiz_id, quiz_kind, correct_answer, points, explanation) values ('m2-q5', 'quiz-m2', 'MODULE', 'D', 1, 'Membaca Al-Fatihah ialah rukun solat, bukan pembatal.') on conflict (question_id) do update set quiz_id = excluded.quiz_id, quiz_kind = excluded.quiz_kind, correct_answer = excluded.correct_answer, points = excluded.points, explanation = excluded.explanation;
insert into public.question_keys (question_id, quiz_id, quiz_kind, correct_answer, points, explanation) values ('m3-q1', 'quiz-m3', 'MODULE', 'A', 1, 'Terdapat 13 rukun solat.') on conflict (question_id) do update set quiz_id = excluded.quiz_id, quiz_kind = excluded.quiz_kind, correct_answer = excluded.correct_answer, points = excluded.points, explanation = excluded.explanation;
insert into public.question_keys (question_id, quiz_id, quiz_kind, correct_answer, points, explanation) values ('m3-q2', 'quiz-m3', 'MODULE', 'A', 1, 'Rukun qalbi ialah niat yang wajib diniatkan di dalam hati.') on conflict (question_id) do update set quiz_id = excluded.quiz_id, quiz_kind = excluded.quiz_kind, correct_answer = excluded.correct_answer, points = excluded.points, explanation = excluded.explanation;
insert into public.question_keys (question_id, quiz_id, quiz_kind, correct_answer, points, explanation) values ('m3-q3', 'quiz-m3', 'MODULE', 'A', 1, 'Membaca Al-Fatihah ialah rukun qauli yang wajib dilafazkan.') on conflict (question_id) do update set quiz_id = excluded.quiz_id, quiz_kind = excluded.quiz_kind, correct_answer = excluded.correct_answer, points = excluded.points, explanation = excluded.explanation;
insert into public.question_keys (question_id, quiz_id, quiz_kind, correct_answer, points, explanation) values ('m3-q4', 'quiz-m3', 'MODULE', 'A', 1, 'Niat perlu merangkumi qasad (tujuan), ta''arrud (menyatakan fardu) dan ta''yin (menentukan jenis solat).') on conflict (question_id) do update set quiz_id = excluded.quiz_id, quiz_kind = excluded.quiz_kind, correct_answer = excluded.correct_answer, points = excluded.points, explanation = excluded.explanation;
insert into public.question_keys (question_id, quiz_id, quiz_kind, correct_answer, points, explanation) values ('m3-q5', 'quiz-m3', 'MODULE', 'A', 1, 'Rukuk, iktidal, sujud dan duduk antara dua sujud wajib disertakan tamakninah.') on conflict (question_id) do update set quiz_id = excluded.quiz_id, quiz_kind = excluded.quiz_kind, correct_answer = excluded.correct_answer, points = excluded.points, explanation = excluded.explanation;
insert into public.question_keys (question_id, quiz_id, quiz_kind, correct_answer, points, explanation) values ('m4-q1', 'quiz-m4', 'MODULE', 'A', 1, 'Meninggalkan sunat ab''ad disunatkan digantikan dengan sujud sahwi; sunat hai''at tidak.') on conflict (question_id) do update set quiz_id = excluded.quiz_id, quiz_kind = excluded.quiz_kind, correct_answer = excluded.correct_answer, points = excluded.points, explanation = excluded.explanation;
insert into public.question_keys (question_id, quiz_id, quiz_kind, correct_answer, points, explanation) values ('m4-q2', 'quiz-m4', 'MODULE', 'A', 1, 'Sujud sahwi dilakukan sebelum memberi salam.') on conflict (question_id) do update set quiz_id = excluded.quiz_id, quiz_kind = excluded.quiz_kind, correct_answer = excluded.correct_answer, points = excluded.points, explanation = excluded.explanation;
insert into public.question_keys (question_id, quiz_id, quiz_kind, correct_answer, points, explanation) values ('m4-q3', 'quiz-m4', 'MODULE', 'A', 1, 'Bacaan sujud sahwi ialah Subhana man la yanamu wa la yashu.') on conflict (question_id) do update set quiz_id = excluded.quiz_id, quiz_kind = excluded.quiz_kind, correct_answer = excluded.correct_answer, points = excluded.points, explanation = excluded.explanation;
insert into public.question_keys (question_id, quiz_id, quiz_kind, correct_answer, points, explanation) values ('m4-q4', 'quiz-m4', 'MODULE', 'A', 1, 'Duduk tahiyat awal ialah salah satu daripada tujuh sunat ab''ad.') on conflict (question_id) do update set quiz_id = excluded.quiz_id, quiz_kind = excluded.quiz_kind, correct_answer = excluded.correct_answer, points = excluded.points, explanation = excluded.explanation;
insert into public.question_keys (question_id, quiz_id, quiz_kind, correct_answer, points, explanation) values ('m4-q5', 'quiz-m4', 'MODULE', 'A', 1, 'Duduk tawarruk dilakukan ketika tahiyat akhir; duduk iftirasy pada tempat selainnya.') on conflict (question_id) do update set quiz_id = excluded.quiz_id, quiz_kind = excluded.quiz_kind, correct_answer = excluded.correct_answer, points = excluded.points, explanation = excluded.explanation;
insert into public.question_keys (question_id, quiz_id, quiz_kind, correct_answer, points, explanation) values ('m5-q1', 'quiz-m5', 'MODULE', 'A', 1, 'Meninggalkan solat fardu dengan sengaja menanggung dosa besar.') on conflict (question_id) do update set quiz_id = excluded.quiz_id, quiz_kind = excluded.quiz_kind, correct_answer = excluded.correct_answer, points = excluded.points, explanation = excluded.explanation;
insert into public.question_keys (question_id, quiz_id, quiz_kind, correct_answer, points, explanation) values ('m5-q2', 'quiz-m5', 'MODULE', 'A', 1, 'Surah Al-Muddathir menyebut neraka Saqar.') on conflict (question_id) do update set quiz_id = excluded.quiz_id, quiz_kind = excluded.quiz_kind, correct_answer = excluded.correct_answer, points = excluded.points, explanation = excluded.explanation;
insert into public.question_keys (question_id, quiz_id, quiz_kind, correct_answer, points, explanation) values ('m5-q3', 'quiz-m5', 'MODULE', 'A', 1, 'Menolak atau mengingkari kefarduan solat boleh menyebabkan seseorang menjadi kafir.') on conflict (question_id) do update set quiz_id = excluded.quiz_id, quiz_kind = excluded.quiz_kind, correct_answer = excluded.correct_answer, points = excluded.points, explanation = excluded.explanation;
insert into public.question_keys (question_id, quiz_id, quiz_kind, correct_answer, points, explanation) values ('m5-q4', 'quiz-m5', 'MODULE', 'A', 1, 'Solat menjadi penawar stres dan memberikan kebahagiaan serta ketenangan jiwa.') on conflict (question_id) do update set quiz_id = excluded.quiz_id, quiz_kind = excluded.quiz_kind, correct_answer = excluded.correct_answer, points = excluded.points, explanation = excluded.explanation;
insert into public.question_keys (question_id, quiz_id, quiz_kind, correct_answer, points, explanation) values ('m5-q5', 'quiz-m5', 'MODULE', 'A', 1, 'Solat mencegah keji dan mungkar serta melahirkan masyarakat yang harmoni.') on conflict (question_id) do update set quiz_id = excluded.quiz_id, quiz_kind = excluded.quiz_kind, correct_answer = excluded.correct_answer, points = excluded.points, explanation = excluded.explanation;
insert into public.question_keys (question_id, quiz_id, quiz_kind, correct_answer, points, explanation) values ('m6-q1', 'quiz-m6', 'MODULE', 'A', 1, 'Berdiri dan qiam meluruskan tulang belakang serta membesarkan rongga dada.') on conflict (question_id) do update set quiz_id = excluded.quiz_id, quiz_kind = excluded.quiz_kind, correct_answer = excluded.correct_answer, points = excluded.points, explanation = excluded.explanation;
insert into public.question_keys (question_id, quiz_id, quiz_kind, correct_answer, points, explanation) values ('m6-q2', 'quiz-m6', 'MODULE', 'A', 1, 'Rukuk dan iktidal mengelakkan sakit tulang belakang serta menjadi terapi sakit pinggang.') on conflict (question_id) do update set quiz_id = excluded.quiz_id, quiz_kind = excluded.quiz_kind, correct_answer = excluded.correct_answer, points = excluded.points, explanation = excluded.explanation;
insert into public.question_keys (question_id, quiz_id, quiz_kind, correct_answer, points, explanation) values ('m6-q3', 'quiz-m6', 'MODULE', 'A', 1, 'Sujud meningkatkan pengaliran darah dan oksigen ke otak serta daya ingatan.') on conflict (question_id) do update set quiz_id = excluded.quiz_id, quiz_kind = excluded.quiz_kind, correct_answer = excluded.correct_answer, points = excluded.points, explanation = excluded.explanation;
insert into public.question_keys (question_id, quiz_id, quiz_kind, correct_answer, points, explanation) values ('m6-q4', 'quiz-m6', 'MODULE', 'A', 1, 'Pergerakan ini melancarkan darah ke jantung dan merendahkan risiko penyakit jantung.') on conflict (question_id) do update set quiz_id = excluded.quiz_id, quiz_kind = excluded.quiz_kind, correct_answer = excluded.correct_answer, points = excluded.points, explanation = excluded.explanation;
insert into public.question_keys (question_id, quiz_id, quiz_kind, correct_answer, points, explanation) values ('m6-q5', 'quiz-m6', 'MODULE', 'A', 1, 'Tujuh anggota sujud: dahi, dua tapak tangan, dua lutut dan dua hujung jari kaki.') on conflict (question_id) do update set quiz_id = excluded.quiz_id, quiz_kind = excluded.quiz_kind, correct_answer = excluded.correct_answer, points = excluded.points, explanation = excluded.explanation;
insert into public.question_keys (question_id, quiz_id, quiz_kind, correct_answer, points, explanation) values ('m7-q1', 'quiz-m7', 'MODULE', 'A', 1, 'Khusyuk dari segi bahasa bermaksud senyap, tunduk dan merendah diri.') on conflict (question_id) do update set quiz_id = excluded.quiz_id, quiz_kind = excluded.quiz_kind, correct_answer = excluded.correct_answer, points = excluded.points, explanation = excluded.explanation;
insert into public.question_keys (question_id, quiz_id, quiz_kind, correct_answer, points, explanation) values ('m7-q2', 'quiz-m7', 'MODULE', 'A', 1, 'Khusyuk membolehkan seseorang merasai kemanisan iman.') on conflict (question_id) do update set quiz_id = excluded.quiz_id, quiz_kind = excluded.quiz_kind, correct_answer = excluded.correct_answer, points = excluded.points, explanation = excluded.explanation;
insert into public.question_keys (question_id, quiz_id, quiz_kind, correct_answer, points, explanation) values ('m7-q3', 'quiz-m7', 'MODULE', 'A', 1, 'Sumber haram menghalang kekhusyukan hati di hadapan Allah.') on conflict (question_id) do update set quiz_id = excluded.quiz_id, quiz_kind = excluded.quiz_kind, correct_answer = excluded.correct_answer, points = excluded.points, explanation = excluded.explanation;
insert into public.question_keys (question_id, quiz_id, quiz_kind, correct_answer, points, explanation) values ('m7-q4', 'quiz-m7', 'MODULE', 'A', 1, 'Persediaan termasuk awal waktu, wuduk sempurna, rawatib dan menjauhkan gangguan.') on conflict (question_id) do update set quiz_id = excluded.quiz_id, quiz_kind = excluded.quiz_kind, correct_answer = excluded.correct_answer, points = excluded.points, explanation = excluded.explanation;
insert into public.question_keys (question_id, quiz_id, quiz_kind, correct_answer, points, explanation) values ('m7-q5', 'quiz-m7', 'MODULE', 'A', 1, 'Hati hendaklah yakin Allah melihat dan menganggap solat itu sebagai solat terakhir.') on conflict (question_id) do update set quiz_id = excluded.quiz_id, quiz_kind = excluded.quiz_kind, correct_answer = excluded.correct_answer, points = excluded.points, explanation = excluded.explanation;

-- Kunci jawapan pentaksiran akhir
insert into public.question_keys (question_id, quiz_id, quiz_kind, correct_answer, points, explanation) values ('final-q01', 'quiz-pentaksiran-akhir', 'FINAL', 'B', 1, 'Solat dari segi bahasa bermaksud doa.') on conflict (question_id) do update set quiz_id = excluded.quiz_id, quiz_kind = excluded.quiz_kind, correct_answer = excluded.correct_answer, points = excluded.points, explanation = excluded.explanation;
insert into public.question_keys (question_id, quiz_id, quiz_kind, correct_answer, points, explanation) values ('final-q02', 'quiz-pentaksiran-akhir', 'FINAL', 'C', 1, 'Syarat wajib solat: Islam, baligh, berakal, dan suci daripada haid serta nifas.') on conflict (question_id) do update set quiz_id = excluded.quiz_id, quiz_kind = excluded.quiz_kind, correct_answer = excluded.correct_answer, points = excluded.points, explanation = excluded.explanation;
insert into public.question_keys (question_id, quiz_id, quiz_kind, correct_answer, points, explanation) values ('final-q03', 'quiz-pentaksiran-akhir', 'FINAL', 'B', 1, 'Rukun qauli wajib dilafazkan dengan suara sekadar didengari telinga sendiri.') on conflict (question_id) do update set quiz_id = excluded.quiz_id, quiz_kind = excluded.quiz_kind, correct_answer = excluded.correct_answer, points = excluded.points, explanation = excluded.explanation;
insert into public.question_keys (question_id, quiz_id, quiz_kind, correct_answer, points, explanation) values ('final-q04', 'quiz-pentaksiran-akhir', 'FINAL', 'C', 1, 'Sujud meningkatkan pengaliran darah dan oksigen ke otak sehingga daya ingatan meningkat.') on conflict (question_id) do update set quiz_id = excluded.quiz_id, quiz_kind = excluded.quiz_kind, correct_answer = excluded.correct_answer, points = excluded.points, explanation = excluded.explanation;
insert into public.question_keys (question_id, quiz_id, quiz_kind, correct_answer, points, explanation) values ('final-q05', 'quiz-pentaksiran-akhir', 'FINAL', 'C', 1, 'Ketawa sehingga zahir dua huruf yang difahami membatalkan solat.') on conflict (question_id) do update set quiz_id = excluded.quiz_id, quiz_kind = excluded.quiz_kind, correct_answer = excluded.correct_answer, points = excluded.points, explanation = excluded.explanation;
insert into public.question_keys (question_id, quiz_id, quiz_kind, correct_answer, points, explanation) values ('final-q06', 'quiz-pentaksiran-akhir', 'FINAL', 'A', 1, 'Doa qunut ialah sunat ab''ad; jika tertinggal, disunatkan sujud sahwi.') on conflict (question_id) do update set quiz_id = excluded.quiz_id, quiz_kind = excluded.quiz_kind, correct_answer = excluded.correct_answer, points = excluded.points, explanation = excluded.explanation;
insert into public.question_keys (question_id, quiz_id, quiz_kind, correct_answer, points, explanation) values ('final-q07', 'quiz-pentaksiran-akhir', 'FINAL', 'B', 1, 'Al-Fatihah ialah rukun qauli yang wajib dilafazkan; doa iftitah ialah sunat hai''at yang boleh dibaca dalam hati.') on conflict (question_id) do update set quiz_id = excluded.quiz_id, quiz_kind = excluded.quiz_kind, correct_answer = excluded.correct_answer, points = excluded.points, explanation = excluded.explanation;
insert into public.question_keys (question_id, quiz_id, quiz_kind, correct_answer, points, explanation) values ('final-q08', 'quiz-pentaksiran-akhir', 'FINAL', 'C', 1, 'Meninggalkan solat kerana malas berdosa besar; mengingkari kefarduan solat boleh menyebabkan kufur.') on conflict (question_id) do update set quiz_id = excluded.quiz_id, quiz_kind = excluded.quiz_kind, correct_answer = excluded.correct_answer, points = excluded.points, explanation = excluded.explanation;
insert into public.question_keys (question_id, quiz_id, quiz_kind, correct_answer, points, explanation) values ('final-q09', 'quiz-pentaksiran-akhir', 'FINAL', 'B', 1, 'Sumber haram menghalang kekhusyukan, tetapi tidak membatalkan solat secara automatik.') on conflict (question_id) do update set quiz_id = excluded.quiz_id, quiz_kind = excluded.quiz_kind, correct_answer = excluded.correct_answer, points = excluded.points, explanation = excluded.explanation;
insert into public.question_keys (question_id, quiz_id, quiz_kind, correct_answer, points, explanation) values ('final-q10', 'quiz-pentaksiran-akhir', 'FINAL', 'B', 1, 'Susunan logik: wuduk, menutup aurat dan kiblat, jauhkan gangguan, kemudian rawatib.') on conflict (question_id) do update set quiz_id = excluded.quiz_id, quiz_kind = excluded.quiz_kind, correct_answer = excluded.correct_answer, points = excluded.points, explanation = excluded.explanation;
insert into public.question_keys (question_id, quiz_id, quiz_kind, correct_answer, points, explanation) values ('final-q11', 'quiz-pentaksiran-akhir', 'FINAL', 'A', 1, 'Solat difardukan pada malam Israk dan Mikraj, dua tahun sebelum hijrah.') on conflict (question_id) do update set quiz_id = excluded.quiz_id, quiz_kind = excluded.quiz_kind, correct_answer = excluded.correct_answer, points = excluded.points, explanation = excluded.explanation;
insert into public.question_keys (question_id, quiz_id, quiz_kind, correct_answer, points, explanation) values ('final-q12', 'quiz-pentaksiran-akhir', 'FINAL', 'A', 1, 'Sunat hai''at yang ditinggalkan tidak membatalkan solat dan tidak perlu sujud sahwi.') on conflict (question_id) do update set quiz_id = excluded.quiz_id, quiz_kind = excluded.quiz_kind, correct_answer = excluded.correct_answer, points = excluded.points, explanation = excluded.explanation;
insert into public.question_keys (question_id, quiz_id, quiz_kind, correct_answer, points, explanation) values ('final-q13', 'quiz-pentaksiran-akhir', 'FINAL', 'B', 1, 'Pergerakan anggota besar seperti tangan sebanyak tiga kali berturut-turut membatalkan solat.') on conflict (question_id) do update set quiz_id = excluded.quiz_id, quiz_kind = excluded.quiz_kind, correct_answer = excluded.correct_answer, points = excluded.points, explanation = excluded.explanation;
insert into public.question_keys (question_id, quiz_id, quiz_kind, correct_answer, points, explanation) values ('final-q14', 'quiz-pentaksiran-akhir', 'FINAL', 'A', 1, 'Pergerakan tersebut melancarkan darah ke jantung dan merendahkan risiko penyakit jantung.') on conflict (question_id) do update set quiz_id = excluded.quiz_id, quiz_kind = excluded.quiz_kind, correct_answer = excluded.correct_answer, points = excluded.points, explanation = excluded.explanation;
insert into public.question_keys (question_id, quiz_id, quiz_kind, correct_answer, points, explanation) values ('final-q15', 'quiz-pentaksiran-akhir', 'FINAL', 'B', 1, 'Solat ketika makanan terhidang atau ketika lapar ialah penghalang khusyuk, bukan tindakan yang wajar.') on conflict (question_id) do update set quiz_id = excluded.quiz_id, quiz_kind = excluded.quiz_kind, correct_answer = excluded.correct_answer, points = excluded.points, explanation = excluded.explanation;
insert into public.question_keys (question_id, quiz_id, quiz_kind, correct_answer, points, explanation) values ('final-q16', 'quiz-pentaksiran-akhir', 'FINAL', 'A', 1, 'Ta''yin ialah elemen niat yang menentukan jenis solat.') on conflict (question_id) do update set quiz_id = excluded.quiz_id, quiz_kind = excluded.quiz_kind, correct_answer = excluded.correct_answer, points = excluded.points, explanation = excluded.explanation;
insert into public.question_keys (question_id, quiz_id, quiz_kind, correct_answer, points, explanation) values ('final-q17', 'quiz-pentaksiran-akhir', 'FINAL', 'A', 1, 'Surah Al-Muddathir menyebut neraka Saqar.') on conflict (question_id) do update set quiz_id = excluded.quiz_id, quiz_kind = excluded.quiz_kind, correct_answer = excluded.correct_answer, points = excluded.points, explanation = excluded.explanation;
insert into public.question_keys (question_id, quiz_id, quiz_kind, correct_answer, points, explanation) values ('final-q18', 'quiz-pentaksiran-akhir', 'FINAL', 'A', 1, 'Duduk tawarruk disunatkan ketika tahiyat akhir.') on conflict (question_id) do update set quiz_id = excluded.quiz_id, quiz_kind = excluded.quiz_kind, correct_answer = excluded.correct_answer, points = excluded.points, explanation = excluded.explanation;
insert into public.question_keys (question_id, quiz_id, quiz_kind, correct_answer, points, explanation) values ('final-q19', 'quiz-pentaksiran-akhir', 'FINAL', 'A', 1, 'Rukuk dan iktidal menjadi terapi sakit pinggang.') on conflict (question_id) do update set quiz_id = excluded.quiz_id, quiz_kind = excluded.quiz_kind, correct_answer = excluded.correct_answer, points = excluded.points, explanation = excluded.explanation;
insert into public.question_keys (question_id, quiz_id, quiz_kind, correct_answer, points, explanation) values ('final-q20', 'quiz-pentaksiran-akhir', 'FINAL', 'A', 1, 'Peranan hati termasuk yakin Allah melihat dan menganggap solat sebagai solat terakhir.') on conflict (question_id) do update set quiz_id = excluded.quiz_id, quiz_kind = excluded.quiz_kind, correct_answer = excluded.correct_answer, points = excluded.points, explanation = excluded.explanation;

-- Pastikan tetapan lalai wujud.
insert into public.app_settings (key, value) values ('sheet_webhook_url', ''), ('sheet_webhook_secret', '') on conflict (key) do nothing;


-- ==================== 004_teachers_and_classes.sql ====================
-- ============================================================================
-- MOOC Solat Mercu Kejayaan — Guru Kelas & senarai kelas tetap
-- Jalankan selepas 001_schema.sql, 002_rpc.sql dan 003_seed.sql.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Kelas yang dibenarkan
-- ---------------------------------------------------------------------------
create or replace function public.normalize_class_name(p_class text)
returns text
language sql
immutable
as $$
  select upper(regexp_replace(trim(coalesce(p_class, '')), '\s+', ' ', 'g'));
$$;

create or replace function public.is_valid_class(p_class text)
returns boolean
language sql
immutable
as $$
  select public.normalize_class_name(p_class) = any (array[
    '1 AMANAH',
    '1 BUDIMAN',
    '1 CEKAL',
    '1 DAMAI',
    '1 EHSAN',
    '1 FIKRAH',
    '1 GIGIH',
    '1 JUJUR',
    '1 IKHLAS',
    '1 KUKUH',
    '1 MURNI'
  ]::text[]);
$$;

revoke all on function public.normalize_class_name(text) from public;
revoke all on function public.is_valid_class(text) from public;
grant execute on function public.normalize_class_name(text) to authenticated;
grant execute on function public.is_valid_class(text) to authenticated;

-- Normalkan kelas sedia ada yang sepadan (cth. "1 Amanah" → "1 AMANAH").
update public.profiles
   set class_name = public.normalize_class_name(class_name),
       updated_at = now()
 where class_name is not null
   and public.is_valid_class(class_name)
   and class_name is distinct from public.normalize_class_name(class_name);

-- ---------------------------------------------------------------------------
-- Peranan guru
-- ---------------------------------------------------------------------------
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('STUDENT', 'ADMIN', 'TEACHER'));

create table if not exists public.teacher_assignments (
  email text not null,
  class_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (email, class_name)
);

update public.teacher_assignments
   set email = lower(trim(email))
 where email <> lower(trim(email));

create index if not exists idx_teacher_assignments_class
  on public.teacher_assignments(class_name);

alter table public.teacher_assignments enable row level security;

drop policy if exists teacher_assignments_select_own on public.teacher_assignments;
create policy teacher_assignments_select_own on public.teacher_assignments
  for select to authenticated using (
    lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

revoke all on public.teacher_assignments from anon, authenticated;
grant select on public.teacher_assignments to authenticated;

create or replace function public.is_teacher()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'TEACHER'
  );
$$;

create or replace function public.current_teacher_classes()
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(array_agg(distinct ta.class_name order by ta.class_name), '{}'::text[])
  from public.profiles p
  join public.teacher_assignments ta on lower(ta.email) = lower(p.email)
  where p.id = auth.uid() and p.role = 'TEACHER';
$$;

revoke all on function public.is_teacher() from public;
revoke all on function public.current_teacher_classes() from public;
grant execute on function public.is_teacher() to authenticated;
grant execute on function public.current_teacher_classes() to authenticated;

-- Skop kelas untuk staf:
--   ADMIN   → null (semua kelas)
--   TEACHER → senarai kelas yang ditetapkan
--   lain    → ralat
create or replace function public.staff_class_scope()
returns text[]
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_role text;
  v_classes text[];
begin
  select role into v_role from public.profiles where id = auth.uid();

  if v_role = 'ADMIN' then
    return null;
  end if;

  if v_role = 'TEACHER' then
    v_classes := public.current_teacher_classes();
    if coalesce(array_length(v_classes, 1), 0) = 0 then
      raise exception 'Kelas guru belum ditetapkan.';
    end if;
    return v_classes;
  end if;

  raise exception 'Tiada kebenaran.';
end;
$$;

revoke all on function public.staff_class_scope() from public;
grant execute on function public.staff_class_scope() to authenticated;

-- ---------------------------------------------------------------------------
-- Profil automatik: kenal guru berdasarkan emel yang didaftarkan admin
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(coalesce(new.email, ''));
  v_admin boolean := (v_email = 'zfzariff2@gmail.com');
  v_teacher boolean := false;
  v_name text := nullif(trim(coalesce(new.raw_user_meta_data->>'full_name', '')), '');
begin
  select exists (
    select 1 from public.teacher_assignments ta where lower(ta.email) = v_email
  ) into v_teacher;

  insert into public.profiles (id, email, role, profile_completed, full_name)
  values (
    new.id,
    v_email,
    case when v_admin then 'ADMIN' when v_teacher then 'TEACHER' else 'STUDENT' end,
    v_admin or v_teacher,
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

-- ---------------------------------------------------------------------------
-- Lengkapkan profil pelajar: kelas wajib daripada senarai
-- ---------------------------------------------------------------------------
create or replace function public.complete_profile(p_full_name text, p_class_name text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := trim(coalesce(p_full_name, ''));
  v_class text := public.normalize_class_name(p_class_name);
  v_profile public.profiles;
begin
  if auth.uid() is null then
    raise exception 'Sesi tamat. Sila log masuk semula.';
  end if;

  if not exists (
    select 1 from public.profiles where id = auth.uid() and role = 'STUDENT'
  ) then
    raise exception 'Akaun ini bukan akaun pelajar.';
  end if;

  if length(v_name) < 3
     or v_name !~ '^[A-Za-zÀ-ÖØ-öø-ÿ'' .-]+$'
     or array_length(regexp_split_to_array(v_name, '\s+'), 1) < 2 then
    raise exception 'Sila masukkan nama penuh (contoh: Ahmad bin Abdullah).';
  end if;

  if not public.is_valid_class(v_class) then
    raise exception 'Sila pilih kelas daripada senarai yang disediakan.';
  end if;

  update public.profiles
     set full_name = v_name,
         class_name = v_class,
         profile_completed = true,
         updated_at = now()
   where id = auth.uid() and role = 'STUDENT'
   returning * into v_profile;

  perform public.enqueue_sheet_sync('PROFILE_UPDATED', jsonb_build_object(
    'student_id', v_profile.id,
    'student_name', v_profile.full_name,
    'class_name', v_profile.class_name,
    'email', v_profile.email,
    'profile_completed', v_profile.profile_completed,
    'updated_at', now()
  ));

  return jsonb_build_object(
    'id', v_profile.id,
    'email', v_profile.email,
    'full_name', v_profile.full_name,
    'class_name', v_profile.class_name,
    'role', v_profile.role,
    'profile_completed', v_profile.profile_completed
  );
end;
$$;

revoke all on function public.complete_profile(text, text) from public;
grant execute on function public.complete_profile(text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Pengurusan guru (admin sahaja)
-- ---------------------------------------------------------------------------
create or replace function public.admin_list_teachers()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if not public.is_admin() then raise exception 'Tiada kebenaran.'; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'email', s.email,
           'full_name', s.full_name,
           'status', s.status,
           'classes', s.classes,
           'created_at', s.created_at,
           'updated_at', s.updated_at
         ) order by s.email), '[]'::jsonb)
    into v_result
  from (
    select ta.email,
           p.full_name,
           case
             when p.id is null then 'MENUNGGU'
             when p.role = 'TEACHER' then 'AKTIF'
             else 'PERLU_SEMAK'
           end as status,
           jsonb_agg(ta.class_name order by ta.class_name) as classes,
           min(ta.created_at) as created_at,
           max(ta.updated_at) as updated_at
    from public.teacher_assignments ta
    left join public.profiles p on lower(p.email) = lower(ta.email)
    group by ta.email, p.id, p.full_name, p.role
  ) s;

  return v_result;
end;
$$;

revoke all on function public.admin_list_teachers() from public;
grant execute on function public.admin_list_teachers() to authenticated;

create or replace function public.admin_set_teacher_classes(p_email text, p_classes text[])
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_classes text[];
  v_class text;
  v_profile public.profiles;
  v_profile_exists boolean := false;
  v_was_student boolean := false;
begin
  if not public.is_admin() then raise exception 'Tiada kebenaran.'; end if;

  if v_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' then
    raise exception 'Alamat emel tidak sah.';
  end if;

  if v_email = 'zfzariff2@gmail.com' then
    raise exception 'Akaun pentadbir tidak boleh dijadikan guru.';
  end if;

  if p_classes is null or coalesce(array_length(p_classes, 1), 0) = 0 then
    raise exception 'Pilih sekurang-kurangnya satu kelas.';
  end if;

  select array_agg(c order by c)
    into v_classes
  from (
    select distinct public.normalize_class_name(x) as c
    from unnest(p_classes) as x
    where public.normalize_class_name(x) <> ''
  ) s;

  if v_classes is null or array_length(v_classes, 1) = 0 then
    raise exception 'Pilih sekurang-kurangnya satu kelas.';
  end if;

  foreach v_class in array v_classes loop
    if not public.is_valid_class(v_class) then
      raise exception 'Kelas tidak sah: %', v_class;
    end if;
  end loop;

  select * into v_profile from public.profiles where lower(email) = v_email;
  v_profile_exists := found;

  if v_profile_exists then
    if v_profile.role = 'ADMIN' then
      raise exception 'Akaun pentadbir tidak boleh dijadikan guru.';
    end if;
    v_was_student := v_profile.role = 'STUDENT';
  end if;

  delete from public.teacher_assignments ta
   where lower(ta.email) = v_email
     and not (ta.class_name = any(v_classes));

  insert into public.teacher_assignments (email, class_name)
  select v_email, c from unnest(v_classes) as c
  on conflict (email, class_name) do update
    set updated_at = now();

  if v_profile_exists then
    update public.profiles
       set role = 'TEACHER',
           profile_completed = true,
           updated_at = now()
     where id = v_profile.id;
  end if;

  return jsonb_build_object(
    'email', v_email,
    'classes', to_jsonb(v_classes),
    'profile_exists', v_profile_exists,
    'was_student', v_was_student
  );
end;
$$;

revoke all on function public.admin_set_teacher_classes(text, text[]) from public;
grant execute on function public.admin_set_teacher_classes(text, text[]) to authenticated;

create or replace function public.admin_remove_teacher(p_email text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_profile public.profiles;
begin
  if not public.is_admin() then raise exception 'Tiada kebenaran.'; end if;

  if v_email = '' then
    raise exception 'Emel guru diperlukan.';
  end if;

  delete from public.teacher_assignments ta where lower(ta.email) = v_email;

  select * into v_profile from public.profiles where lower(email) = v_email;
  if found and v_profile.role = 'TEACHER' then
    update public.profiles
       set role = 'STUDENT',
           profile_completed = false,
           updated_at = now()
     where id = v_profile.id;
  end if;

  return jsonb_build_object('email', v_email, 'removed', true);
end;
$$;

revoke all on function public.admin_remove_teacher(text) from public;
grant execute on function public.admin_remove_teacher(text) to authenticated;

-- ---------------------------------------------------------------------------
-- RPC admin sedia ada — ditapis mengikut skop guru
-- ---------------------------------------------------------------------------
create or replace function public.admin_stats()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_scope text[];
  v_result jsonb;
begin
  v_scope := public.staff_class_scope();

  select jsonb_build_object(
    'students', (
      select count(*)
      from public.profiles p
      where p.role = 'STUDENT'
        and (v_scope is null or public.normalize_class_name(p.class_name) = any(v_scope))
    ),
    'completed_profiles', (
      select count(*)
      from public.profiles p
      where p.role = 'STUDENT'
        and p.profile_completed = true
        and (v_scope is null or public.normalize_class_name(p.class_name) = any(v_scope))
    ),
    'final_submitted', (
      select count(*)
      from public.final_assessment_attempts fa
      join public.profiles p on p.id = fa.student_id
      where fa.submitted_at is not null
        and p.role = 'STUDENT'
        and (v_scope is null or public.normalize_class_name(p.class_name) = any(v_scope))
    ),
    'certificates', (
      select count(*)
      from public.certificates c
      join public.profiles p on p.id = c.student_id
      where p.role = 'STUDENT'
        and (v_scope is null or public.normalize_class_name(p.class_name) = any(v_scope))
    ),
    'average_progress', coalesce((
      select round(avg(coalesce(lp.cnt, 0)) * 100.0 / nullif((select count(*) from public.course_lessons), 0))::int
      from public.profiles p
      left join (
        select student_id, count(*) filter (where completed = true) as cnt
        from public.lesson_progress group by student_id
      ) lp on lp.student_id = p.id
      where p.role = 'STUDENT'
        and (v_scope is null or public.normalize_class_name(p.class_name) = any(v_scope))
    ), 0)
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.admin_stats() from public;
grant execute on function public.admin_stats() to authenticated;

create or replace function public.admin_list_students()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_scope text[];
  v_result jsonb;
begin
  v_scope := public.staff_class_scope();

  select coalesce(jsonb_agg(jsonb_build_object(
           'id', p.id,
           'email', p.email,
           'full_name', p.full_name,
           'class_name', p.class_name,
           'profile_completed', p.profile_completed,
           'created_at', p.created_at,
           'completed_lessons', coalesce(lp.cnt, 0),
           'total_lessons', (select count(*) from public.course_lessons),
           'final_score', fa.score,
           'final_total', fa.total,
           'final_duration', fa.duration_seconds,
           'final_submitted_at', fa.submitted_at,
           'certificate_number', c.certificate_number
         ) order by p.created_at desc), '[]'::jsonb)
    into v_result
  from public.profiles p
  left join (
    select student_id, count(*) filter (where completed = true) as cnt
    from public.lesson_progress group by student_id
  ) lp on lp.student_id = p.id
  left join public.final_assessment_attempts fa
    on fa.student_id = p.id and fa.submitted_at is not null
  left join public.certificates c on c.student_id = p.id
  where p.role = 'STUDENT'
    and (v_scope is null or public.normalize_class_name(p.class_name) = any(v_scope));

  return v_result;
end;
$$;

revoke all on function public.admin_list_students() from public;
grant execute on function public.admin_list_students() to authenticated;

create or replace function public.admin_student_detail(p_student_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_scope text[];
  v_profile public.profiles;
  v_lessons jsonb;
  v_attempts jsonb;
  v_final jsonb;
  v_cert jsonb;
begin
  v_scope := public.staff_class_scope();

  select * into v_profile
  from public.profiles
  where id = p_student_id and role = 'STUDENT';

  if not found then raise exception 'Pelajar tidak dijumpai.'; end if;

  if v_scope is not null and (
    v_profile.class_name is null
    or not (public.normalize_class_name(v_profile.class_name) = any(v_scope))
  ) then
    raise exception 'Pelajar ini bukan dalam kelas anda.';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'lesson_id', cl.id,
           'title', cl.title,
           'order', cl."order",
           'total_slides', cl.total_slides,
           'slides_viewed', coalesce(lp.slides_viewed, 0),
           'percentage', case when cl.total_slides = 0 then 0
                              else round(coalesce(lp.slides_viewed, 0)::numeric / cl.total_slides * 100)::int end,
           'completed', coalesce(lp.completed, false),
           'completed_at', lp.completed_at
         ) order by cl."order"), '[]'::jsonb)
    into v_lessons
  from public.course_lessons cl
  left join public.lesson_progress lp
    on lp.lesson_id = cl.id and lp.student_id = p_student_id;

  select coalesce(jsonb_agg(jsonb_build_object(
           'id', qa.id,
           'quiz_id', qa.quiz_id,
           'score', qa.score,
           'total', qa.total,
           'percentage', qa.percentage,
           'passed', qa.passed,
           'completed_at', qa.completed_at
         ) order by qa.completed_at desc), '[]'::jsonb)
    into v_attempts
  from public.quiz_attempts qa
  where qa.student_id = p_student_id;

  select jsonb_build_object(
           'started_at', fa.started_at,
           'submitted_at', fa.submitted_at,
           'duration_seconds', fa.duration_seconds,
           'score', fa.score,
           'total', fa.total,
           'percentage', fa.percentage,
           'certificate_number', fa.certificate_number,
           'rank', case when fa.submitted_at is not null
                        then public.rank_for(fa.score, fa.duration_seconds, fa.submitted_at)
                        else null end
         )
    into v_final
  from public.final_assessment_attempts fa
  where fa.student_id = p_student_id;

  select jsonb_build_object(
           'certificate_number', c.certificate_number,
           'student_name', c.student_name,
           'class_name', c.class_name,
           'issued_at', c.issued_at,
           'score', c.score,
           'total', c.total,
           'duration_seconds', c.duration_seconds
         )
    into v_cert
  from public.certificates c
  where c.student_id = p_student_id;

  return jsonb_build_object(
    'profile', jsonb_build_object(
      'id', v_profile.id,
      'email', v_profile.email,
      'full_name', v_profile.full_name,
      'class_name', v_profile.class_name,
      'profile_completed', v_profile.profile_completed,
      'created_at', v_profile.created_at
    ),
    'lessons', v_lessons,
    'attempts', v_attempts,
    'final', v_final,
    'certificate', v_cert
  );
end;
$$;

revoke all on function public.admin_student_detail(uuid) from public;
grant execute on function public.admin_student_detail(uuid) to authenticated;

create or replace function public.admin_list_attempts()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_scope text[];
  v_modules jsonb;
  v_finals jsonb;
begin
  v_scope := public.staff_class_scope();

  select coalesce(jsonb_agg(jsonb_build_object(
           'id', qa.id,
           'student_id', qa.student_id,
           'student_name', p.full_name,
           'class_name', p.class_name,
           'email', p.email,
           'quiz_id', qa.quiz_id,
           'quiz_title', coalesce(q.title, qa.quiz_id),
           'score', qa.score,
           'total', qa.total,
           'percentage', qa.percentage,
           'passed', qa.passed,
           'completed_at', qa.completed_at
         ) order by qa.completed_at desc), '[]'::jsonb)
    into v_modules
  from public.quiz_attempts qa
  join public.profiles p on p.id = qa.student_id
  left join public.course_quizzes q on q.id = qa.quiz_id
  where v_scope is null or public.normalize_class_name(p.class_name) = any(v_scope);

  select coalesce(jsonb_agg(jsonb_build_object(
           'id', fa.id,
           'student_id', fa.student_id,
           'student_name', p.full_name,
           'class_name', p.class_name,
           'email', p.email,
           'score', fa.score,
           'total', fa.total,
           'percentage', fa.percentage,
           'duration_seconds', fa.duration_seconds,
           'certificate_number', fa.certificate_number,
           'submitted_at', fa.submitted_at
         ) order by fa.submitted_at desc), '[]'::jsonb)
    into v_finals
  from public.final_assessment_attempts fa
  join public.profiles p on p.id = fa.student_id
  where fa.submitted_at is not null
    and (v_scope is null or public.normalize_class_name(p.class_name) = any(v_scope));

  return jsonb_build_object('module_attempts', v_modules, 'final_attempts', v_finals);
end;
$$;

revoke all on function public.admin_list_attempts() from public;
grant execute on function public.admin_list_attempts() to authenticated;

create or replace function public.admin_list_certificates()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_scope text[];
  v_result jsonb;
begin
  v_scope := public.staff_class_scope();

  select coalesce(jsonb_agg(jsonb_build_object(
           'certificate_number', c.certificate_number,
           'student_id', c.student_id,
           'student_name', coalesce(c.student_name, p.full_name),
           'class_name', coalesce(c.class_name, p.class_name),
           'email', p.email,
           'issued_at', c.issued_at,
           'score', c.score,
           'total', c.total,
           'duration_seconds', c.duration_seconds
         ) order by c.issued_at desc), '[]'::jsonb)
    into v_result
  from public.certificates c
  join public.profiles p on p.id = c.student_id
  where v_scope is null or public.normalize_class_name(p.class_name) = any(v_scope);

  return v_result;
end;
$$;

revoke all on function public.admin_list_certificates() from public;
grant execute on function public.admin_list_certificates() to authenticated;

create or replace function public.admin_leaderboard()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_scope text[];
  v_result jsonb;
begin
  v_scope := public.staff_class_scope();

  select coalesce(jsonb_agg(jsonb_build_object(
           'rank', t.rank,
           'student_id', t.student_id,
           'full_name', t.full_name,
           'class_name', t.class_name,
           'score', t.score,
           'total', t.total,
           'percentage', t.percentage,
           'duration_seconds', t.duration_seconds,
           'submitted_at', t.submitted_at
         ) order by t.rank), '[]'::jsonb)
    into v_result
  from (
    select row_number() over (order by a.score desc, a.duration_seconds asc, a.submitted_at asc) as rank,
           a.student_id, p.full_name, p.class_name, a.score, a.total,
           a.percentage, a.duration_seconds, a.submitted_at
    from public.final_assessment_attempts a
    join public.profiles p on p.id = a.student_id
    where a.submitted_at is not null
      and (v_scope is null or public.normalize_class_name(p.class_name) = any(v_scope))
    order by a.score desc, a.duration_seconds asc, a.submitted_at asc
  ) t;

  return v_result;
end;
$$;

revoke all on function public.admin_leaderboard() from public;
grant execute on function public.admin_leaderboard() to authenticated;

