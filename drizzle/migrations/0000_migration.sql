
create table public.candidates (
  user_id uuid primary key,
  name text not null default '',
  email text not null default '',
  headline text not null default '',
  location text not null default '',
  seniority text not null default 'junior',
  years_experience real not null default 0,
  target_roles jsonb not null default '[]'::jsonb,
  work_modes jsonb not null default '["hybrid","remote"]'::jsonb,
  min_salary integer,
  hours_per_week integer not null default 3,
  long_shot_goal text,
  retention_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.resumes (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  text text not null,
  created_at timestamptz not null default now()
);
create index on public.resumes (user_id, id desc);

create table public.jobs (
  user_id uuid not null,
  id text not null,
  title text not null,
  company text not null,
  company_domain text,
  company_verified boolean not null default false,
  location text not null,
  work_mode text not null,
  seniority text not null,
  salary_min integer,
  salary_max integer,
  currency text not null default 'GBP',
  description text not null,
  requirements jsonb not null default '[]'::jsonb,
  posted_at timestamptz not null,
  expires_at timestamptz,
  repost_count integer not null default 0,
  filled_days_ago integer,
  contact_email text,
  source text not null,
  source_url text not null default '',
  take_home boolean not null default false,
  cover_letter_required boolean not null default false,
  primary key (user_id, id)
);

create table public.decisions (
  user_id uuid not null,
  job_id text not null,
  kind text not null,
  reason text not null default '',
  created_at timestamptz not null default now(),
  primary key (user_id, job_id),
  foreign key (user_id, job_id) references public.jobs(user_id, id) on delete cascade
);

create table public.applications (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  job_id text not null,
  status text not null,
  highlights jsonb not null default '[]'::jsonb,
  draft text not null default '',
  cover_letter text not null default '',
  created_at timestamptz not null default now(),
  submitted_at timestamptz,
  confirmed_at timestamptz,
  foreign key (user_id, job_id) references public.jobs(user_id, id)
);
create index on public.applications (user_id);

create table public.application_events (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  application_id bigint not null references public.applications(id) on delete cascade,
  at timestamptz not null default now(),
  kind text not null,
  note text not null default '',
  source text not null default 'candidate',
  confidence real not null default 1,
  confirmed boolean not null default true
);
create index on public.application_events (user_id);

create table public.update_proposals (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  raw text not null,
  proposed_status text not null,
  job_hint text,
  confidence real not null,
  evidence text not null,
  state text not null default 'pending',
  created_at timestamptz not null default now()
);
create index on public.update_proposals (user_id);

do $$
declare t text;
begin
  foreach t in array array['candidates','resumes','jobs','decisions','applications','application_events','update_proposals'] loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "own rows select" on public.%I for select to authenticated using (auth.uid() = user_id)', t);
    execute format('create policy "own rows insert" on public.%I for insert to authenticated with check (auth.uid() = user_id)', t);
    execute format('create policy "own rows update" on public.%I for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
    execute format('create policy "own rows delete" on public.%I for delete to authenticated using (auth.uid() = user_id)', t);
  end loop;
end $$;

-- events must belong to the caller's own application
create or replace function public.check_event_owner() returns trigger
language plpgsql security invoker set search_path = public as $$
begin
  if not exists (select 1 from public.applications a where a.id = new.application_id and a.user_id = new.user_id) then
    raise exception 'application not found';
  end if;
  return new;
end $$;
create trigger application_events_owner before insert or update on public.application_events
for each row execute function public.check_event_owner();
