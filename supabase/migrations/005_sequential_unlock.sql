-- ============================================================================
-- MOOC Solat Mercu Kejayaan — Kunci modul berurutan
-- Jalankan selepas 004_teachers_and_classes.sql.
--
-- Peraturan:
--   1. Modul 1 sentiasa terbuka.
--   2. Modul seterusnya hanya terbuka selepas SEMUA modul sebelumnya selesai
--      (semua nota/slaid dilihat DAN kuiz modul lulus).
--   3. Kuiz modul hanya boleh dihantar selepas semua nota modul itu selesai.
--   4. Jika kuiz gagal, modul seterusnya kekal terkunci sehingga kuiz lulus.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Helper: adakah modul ini terbuka untuk pelajar?
-- ---------------------------------------------------------------------------
create or replace function public.is_lesson_unlocked(p_student_id uuid, p_lesson_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with target as (
    select "order" from public.course_lessons where id = p_lesson_id
  )
  select coalesce((
    select case
      when t."order" = 1 then true
      when exists (
        select 1
        from public.lesson_progress self
        where self.student_id = p_student_id
          and self.lesson_id = p_lesson_id
          and self.completed = true
      ) then true
      else not exists (
        select 1
        from public.course_lessons prev
        where prev."order" < t."order"
          and not exists (
            select 1
            from public.lesson_progress lp
            where lp.student_id = p_student_id
              and lp.lesson_id = prev.id
              and lp.completed = true
          )
      )
    end
    from target t
  ), false);
$$;

revoke all on function public.is_lesson_unlocked(uuid, text) from public;

-- ---------------------------------------------------------------------------
-- Tanda slaid dilihat — tolak jika modul masih terkunci
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
  if not public.is_lesson_unlocked(auth.uid(), p_lesson_id) then
    raise exception 'Modul ini masih dikunci. Selesaikan modul sebelumnya dahulu.';
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
-- Dashboard pelajar — tambah status unlocked / slides_completed
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
           'completed', t.completed,
           'slides_completed', t.slides_completed,
           'unlocked', t.unlocked
         ) order by t."order"), '[]'::jsonb)
    into v_lessons
  from (
    select cl.id, cl.title, cl."order", cl.total_slides, cl.quiz_id,
           coalesce(lp.slides_viewed, 0) as slides_viewed,
           case when cl.total_slides = 0 then 0
                else round(coalesce(lp.slides_viewed, 0)::numeric / cl.total_slides * 100)::int
           end as percentage,
           exists(
             select 1 from public.quiz_attempts qa
             where qa.student_id = auth.uid() and qa.quiz_id = cl.quiz_id and qa.passed = true
           ) as quiz_passed,
           coalesce(lp.completed, false) as completed,
           (coalesce(lp.slides_viewed, 0) >= cl.total_slides) as slides_completed,
           case
             when cl."order" = 1 then true
             when coalesce(lp.completed, false) then true
             else not exists (
               select 1
               from public.course_lessons prev
               where prev."order" < cl."order"
                 and not exists (
                   select 1
                   from public.lesson_progress prev_lp
                   where prev_lp.student_id = auth.uid()
                     and prev_lp.lesson_id = prev.id
                     and prev_lp.completed = true
                 )
             )
           end as unlocked
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
-- Hantar kuiz modul — wajib nota selesai + modul terbuka
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
  v_total_slides int;
  v_slides_viewed int;
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

  if not public.is_lesson_unlocked(auth.uid(), v_quiz.lesson_id) then
    raise exception 'Modul ini masih dikunci. Selesaikan modul sebelumnya dahulu.';
  end if;

  select total_slides into v_total_slides
  from public.course_lessons where id = v_quiz.lesson_id;

  select count(*) into v_slides_viewed
  from public.slide_progress
  where student_id = auth.uid() and lesson_id = v_quiz.lesson_id;

  if v_total_slides is not null and v_slides_viewed < v_total_slides then
    raise exception 'Selesaikan semua nota modul ini dahulu (% daripada % slaid).',
      v_slides_viewed, v_total_slides;
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
