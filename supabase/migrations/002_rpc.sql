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
  v_quiz public.course_quizzes;
  v_attempt public.final_assessment_attempts;
  v_rank int;
begin
  if auth.uid() is null then raise exception 'Sesi tamat.'; end if;

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
    (certificate_number, student_id, issued_at, score, total, duration_seconds)
  values
    (public.next_certificate_number(), auth.uid(), v_submitted_at, v_score, v_total, v_duration)
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
       'student_name', p.full_name,
       'class_name', p.class_name,
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
           'quiz_id', qa.quiz_id,
           'score', qa.score,
           'total', qa.total,
           'percentage', qa.percentage,
           'passed', qa.passed,
           'completed_at', qa.completed_at
         ) order by qa.completed_at desc), '[]'::jsonb)
    into v_modules
  from public.quiz_attempts qa
  join public.profiles p on p.id = qa.student_id;

  select coalesce(jsonb_agg(jsonb_build_object(
           'id', fa.id,
           'student_id', fa.student_id,
           'student_name', p.full_name,
           'class_name', p.class_name,
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
           'student_name', p.full_name,
           'class_name', p.class_name,
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
returns void
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
    return;
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
  exception when others then
    update public.sheet_sync_queue
       set status = 'FAILED', attempts = attempts + 1, last_error = sqlerrm
     where id = v_id;
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

  perform public.enqueue_sheet_sync('FULL_SYNC', jsonb_build_object(
    'students', v_students,
    'module_attempts', v_attempts->'module_attempts',
    'final_attempts', v_attempts->'final_attempts',
    'certificates', v_certs,
    'ranking', v_ranking,
    'generated_at', now()
  ));

  return jsonb_build_object('ok', true, 'message', 'Sync dihantar ke Google Sheets.');
end;
$$;

revoke all on function public.sync_all_sheets() from public;
grant execute on function public.sync_all_sheets() to authenticated;
