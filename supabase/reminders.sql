-- Break's reminders, on the Supabase side. Applied to the Break project on
-- 26 October 2026 as the migrations break_reminders,
-- break_reminders_extensions and break_reminders_cron, and on 31 October 2026
-- break_tasks_doc; kept here as the record.
-- The sending itself is the remind Edge Function, in functions/remind.

-- ---------- break_reminders ----------

-- Each account's choices sync as one more docs row.
alter table public.docs drop constraint docs_key_check;
alter table public.docs add constraint docs_key_check
  check (key = any (array['blocks', 'done', 'climbs', 'solat', 'solatSet', 'qadhaOld', 'reminders']));

-- One row per phone with reminders on. Owners can read and remove theirs;
-- saving goes through put_push_sub, which checks what it's given.
create table public.push_subs (
  endpoint text primary key
    check (length(endpoint) < 1024 and endpoint ~ '^https://([a-z0-9-]+\.)*(push\.apple\.com|fcm\.googleapis\.com|push\.services\.mozilla\.com|notify\.windows\.com)/'),
  user_id uuid not null references auth.users (id) on delete cascade,
  p256dh text not null check (p256dh ~ '^[A-Za-z0-9_-]{80,100}$'),
  auth text not null check (auth ~ '^[A-Za-z0-9_-]{16,30}$'),
  saved_at timestamptz not null default now(),
  ok_at timestamptz,
  err text check (length(err) <= 300)
);
comment on table public.push_subs is 'Break reminders: one row per phone with reminders on. The remind Edge Function sends to these.';
create index push_subs_user_id_idx on public.push_subs (user_id);
alter table public.push_subs enable row level security;
create policy "Owners read their phones" on public.push_subs
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Owners remove their phones" on public.push_subs
  for delete to authenticated using ((select auth.uid()) = user_id);
revoke all on public.push_subs from anon;
revoke insert, update, truncate, references, trigger on public.push_subs from authenticated;

-- A push address belongs to whoever saves it last, so a phone that changes
-- accounts moves with it. An account keeps its five newest phones.
create function public.put_push_sub(p_endpoint text, p_p256dh text, p_auth text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null then
    raise exception 'Sign in first' using errcode = '42501';
  end if;
  insert into public.push_subs as s (endpoint, user_id, p256dh, auth)
  values (p_endpoint, uid, p_p256dh, p_auth)
  on conflict (endpoint) do update
    set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth, saved_at = now(),
        ok_at = case when s.user_id = excluded.user_id then s.ok_at end,
        err = case when s.user_id = excluded.user_id then s.err end;
  delete from public.push_subs
  where user_id = uid and endpoint in (
    select endpoint from public.push_subs where user_id = uid order by saved_at desc offset 5);
end;
$$;
revoke all on function public.put_push_sub(text, text, text) from public, anon;
grant execute on function public.put_push_sub(text, text, text) to authenticated;

create function public.drop_push_sub(p_endpoint text)
returns void
language sql
set search_path = ''
as $$
  delete from public.push_subs where endpoint = p_endpoint;
$$;
revoke all on function public.drop_push_sub(text) from public, anon;
grant execute on function public.drop_push_sub(text) to authenticated;

-- Only the remind function, with the secret key, touches these three.
create table public.push_sent (
  user_id uuid not null references auth.users (id) on delete cascade,
  event text not null check (length(event) < 200),
  at timestamptz not null default now(),
  primary key (user_id, event)
);
comment on table public.push_sent is 'Break reminders already sent, so each goes once. Cleared after three days.';

create table public.prayer_times (
  zone text not null check (zone ~ '^[A-Z]{3}[0-9]{2}$'),
  year int not null check (year between 2020 and 2100),
  days jsonb,
  fetched_at timestamptz not null default now(),
  primary key (zone, year)
);
comment on table public.prayer_times is 'JAKIM e-Solat timetable per zone and year, {"MM-DD": [fajr, syuruk, dhuhr, asr, maghrib, isha]} in minutes from midnight. days is null while e-Solat has none for that year.';

create table public.push_tokens (
  aud text primary key,
  jwt text not null,
  exp bigint not null,
  kid text not null
);
comment on table public.push_tokens is 'Signed VAPID token per push service, reused for hours because Apple asks for it to change at most hourly.';

alter table public.push_sent enable row level security;
alter table public.prayer_times enable row level security;
alter table public.push_tokens enable row level security;
revoke all on public.push_sent, public.prayer_times, public.push_tokens from anon, authenticated;

-- ---------- break_reminders_extensions ----------

-- pg_net lets the database call the remind Edge Function; pg_cron calls it every minute.
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

-- ---------- break_reminders_cron ----------

-- Every minute, ask the remind Edge Function to send what's due. It takes no
-- input and sends each reminder once, so the call needs no key.
select cron.schedule(
  'break-reminders',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://rddznoqnnnqlkmkgiwuj.supabase.co/functions/v1/remind',
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);

-- Once a day (11:17am in Malaysia), forget reminders sent more than three
-- days ago, and pg_cron's own run log, which gains 1,440 rows a day.
select cron.schedule(
  'break-reminders-tidy',
  '17 3 * * *',
  $$
  delete from public.push_sent where at < now() - interval '3 days';
  delete from cron.job_run_details where end_time < now() - interval '3 days';
  $$
);

-- ---------- break_tasks_doc (31 October 2026) ----------

-- Assignments, exams and quizzes sync as one more docs row, "tasks", and the
-- remind function sends their reminders a week, 3 days, a day and an hour before.
alter table public.docs drop constraint docs_key_check;
alter table public.docs add constraint docs_key_check
  check (key = any (array['blocks', 'done', 'tasks', 'climbs', 'solat', 'solatSet', 'qadhaOld', 'reminders']));
