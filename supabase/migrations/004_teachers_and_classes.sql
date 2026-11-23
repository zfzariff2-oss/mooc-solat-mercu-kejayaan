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
