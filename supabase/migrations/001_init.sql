-- ============================================================
-- MOSYF Convention Portal: initial Supabase schema
-- Run in Supabase SQL editor (Postgres 15+). Run once, top to bottom.
-- Before running: Authentication > Providers > Email: DISABLE "Allow new users to sign up".
-- Admin accounts are created by you in the dashboard; members never get Supabase accounts.
-- ============================================================
create extension if not exists pgcrypto;

create type app_role as enum ('super_admin','admin','executive','member');
create type convention_role_type as enum
  ('registration_desk','verification_operator','food_distributor','souvenir_distributor','activity_coordinator','viewer');
create type reg_source as enum ('home','onsite');
create type approval_status as enum ('pending','approved','rejected');
create type resource_type as enum ('food','souvenir');
create type biometric_status as enum ('pending','enrolled','verified','failed','duplicate');

-- ---------- core ----------
create table events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  theme text,
  scripture text,
  start_date date not null,
  end_date date not null,
  venue text,
  description text,
  max_attendees int,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);
create unique index events_one_active on events (is_active) where is_active;

create table profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role app_role not null default 'member',
  created_at timestamptz not null default now()
);

create table convention_roles (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role convention_role_type not null,
  assigned_by uuid references auth.users(id),
  assigned_at timestamptz not null default now(),
  unique (event_id, user_id, role)
);

-- Admin-managed lists: bands, departments, church groups, church locations.
-- "No Band" is NOT a row: members.band_id = null means no band (Group E).
create table list_items (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  kind text not null check (kind in ('band','department','church_group','church_location')),
  name text not null,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create unique index list_items_unique_name on list_items (event_id, kind, lower(name));

create table event_counters (
  event_id uuid not null references events(id) on delete cascade,
  kind text not null,
  value int not null default 0,
  primary key (event_id, kind)
);

-- ---------- people ----------
create table members (
  id uuid primary key default gen_random_uuid(),      -- client may supply (offline-safe)
  event_id uuid not null references events(id),
  member_code text not null,
  full_name text not null,
  email text not null,
  phone text,
  gender text check (gender in ('male','female')),
  date_of_birth date,
  address text,
  occupation text,
  emergency_contact text,
  photo_path text,
  band_id uuid references list_items(id),
  church_location_id uuid references list_items(id),
  church_group_id uuid references list_items(id),
  source reg_source not null default 'home',
  is_first_timer boolean not null default false,
  wants_permanent boolean not null default false,
  convention_group char(1) not null check (convention_group in ('A','B','C','D','E')),
  biometric_status biometric_status not null default 'pending',
  status_token text not null unique default encode(gen_random_bytes(24),'hex'),
  consent_at timestamptz,
  guardian_consent boolean not null default false,
  client_created_at timestamptz,
  created_at timestamptz not null default now(),
  unique (event_id, member_code)
);
create unique index members_event_email on members (event_id, lower(email));
create index members_event_phone on members (event_id, phone);
create index members_event_group on members (event_id, convention_group);

create table member_departments (
  member_id uuid not null references members(id) on delete cascade,
  department_id uuid not null references list_items(id),
  primary key (member_id, department_id)
);

-- Executives are members plus a leadership profile.
create table executive_profiles (
  member_id uuid primary key references members(id) on delete cascade,
  user_id uuid references auth.users(id),
  leadership_role text not null,
  approval approval_status not null default 'pending',
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  exec_code text not null unique,
  created_at timestamptz not null default now()
);

create table registration_links (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id),
  kind text not null check (kind in ('member','executive')),
  token text not null unique default encode(gen_random_bytes(18),'hex'),
  created_by uuid references auth.users(id),
  expires_at timestamptz,
  max_uses int,
  uses int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- convention operations ----------
create table attendance (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id),
  member_id uuid not null references members(id),
  checked_in_at timestamptz not null default now(),
  method text not null check (method in ('qr','member_id','manual','biometric')),
  operator_id uuid references auth.users(id),
  device_id text,
  client_event_id uuid unique,
  unique (event_id, member_id)
);

-- slot = which meal/distribution (e.g. 'day1-lunch'); lets food be claimed once per slot.
create table resource_claims (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id),
  member_id uuid not null references members(id),
  resource resource_type not null,
  slot text not null default 'default',
  claimed_at timestamptz not null default now(),
  operator_id uuid references auth.users(id),
  device_id text,
  client_event_id uuid unique,
  unique (event_id, member_id, resource, slot)
);

create table programmes (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  title text not null,
  description text,
  day date not null,
  start_time time,
  end_time time,
  location text,
  is_active boolean not null default true,
  sort_order int not null default 0
);

create table activities (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  name text not null,
  description text,
  group_requirement char(1) check (group_requirement in ('A','B','C','D','E')),
  starts_at timestamptz,
  location text,
  is_active boolean not null default true
);

create table activity_participation (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id),
  activity_id uuid not null references activities(id),
  member_id uuid not null references members(id),
  recorded_by uuid references auth.users(id),
  recorded_at timestamptz not null default now(),
  client_event_id uuid unique,
  unique (activity_id, member_id)
);

-- Dormant until the scanner is integrated. Deny-all by RLS; store encrypted templates only, never images.
create table biometric_templates (
  member_id uuid primary key references members(id) on delete cascade,
  event_id uuid not null references events(id),
  finger_index int not null default 1,
  template bytea not null,
  consent_at timestamptz not null,
  enrolled_by uuid references auth.users(id),
  enrolled_at timestamptz not null default now()
);

create table audit_log (
  id bigserial primary key,
  event_id uuid,
  actor_id uuid,
  action text not null,
  target_type text,
  target_id text,
  details jsonb,
  created_at timestamptz not null default now()
);

create table email_outbox (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id),
  member_id uuid not null references members(id) on delete cascade,
  to_email text not null,
  template text not null default 'registration_confirmation',
  payload jsonb not null default '{}',
  status text not null default 'pending' check (status in ('pending','sent','failed')),
  attempts int not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index email_outbox_pending on email_outbox (status, created_at) where status = 'pending';

create table registration_attempts (
  id bigserial primary key,
  ip_hash text not null,
  email_hash text,
  created_at timestamptz not null default now()
);
create index registration_attempts_ip on registration_attempts (ip_hash, created_at);

-- ---------- helper functions ----------
create function current_app_role() returns app_role
language sql stable security definer set search_path = public as
$$ select role from profiles where user_id = auth.uid() $$;

create function is_admin() returns boolean
language sql stable security definer set search_path = public as
$$ select coalesce(current_app_role() in ('super_admin','admin'), false) $$;

create function is_super_admin() returns boolean
language sql stable security definer set search_path = public as
$$ select coalesce(current_app_role() = 'super_admin', false) $$;

create function has_convention_role(p_event uuid, p_roles convention_role_type[])
returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from convention_roles
                  where event_id = p_event and user_id = auth.uid() and role = any(p_roles)) $$;

create function is_staff(p_event uuid) returns boolean
language sql stable security definer set search_path = public as
$$ select is_admin() or exists (select 1 from convention_roles
                                where event_id = p_event and user_id = auth.uid()) $$;

create function next_counter(p_event uuid, p_kind text) returns int
language plpgsql security definer set search_path = public as $$
declare v int;
begin
  insert into event_counters (event_id, kind, value) values (p_event, p_kind, 1)
  on conflict (event_id, kind) do update set value = event_counters.value + 1
  returning value into v;
  return v;
end $$;

-- Atomic group assignment: no band -> E; band -> least-populated of A-D.
create function assign_group(p_event uuid, p_band uuid) returns char(1)
language plpgsql security definer set search_path = public as $$
declare g char(1);
begin
  if p_band is null then return 'E'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_event::text, 0));
  select x.grp::char(1) into g
  from (values ('A'),('B'),('C'),('D')) as x(grp)
  left join members m on m.event_id = p_event and m.convention_group = x.grp::char(1)
  group by x.grp
  order by count(m.id), x.grp
  limit 1;
  return g;
end $$;

-- ---------- registration (called ONLY by the edge function, service role) ----------
create function register_member(p_token text, p_payload jsonb, p_source reg_source default 'home')
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_link registration_links%rowtype;
  v_id uuid; v_band uuid; v_group char(1); v_n int; v_year text; v_code text;
  v_email text; v_dob date; v_token text; v_exec text;
begin
  select * into v_link from registration_links where token = p_token for update;
  if not found or not v_link.is_active
     or (v_link.expires_at is not null and v_link.expires_at < now())
     or (v_link.max_uses is not null and v_link.uses >= v_link.max_uses) then
    raise exception 'INVALID_LINK';
  end if;

  v_id := coalesce(nullif(p_payload->>'id','')::uuid, gen_random_uuid());
  -- idempotent replay (offline queue resend)
  select status_token into v_token from members where id = v_id;
  if found then
    return (select jsonb_build_object('member_id', id, 'member_code', member_code,
              'convention_group', convention_group, 'status_token', status_token, 'replayed', true)
            from members where id = v_id);
  end if;

  if coalesce(p_payload->>'consent','') <> 'true' then raise exception 'CONSENT_REQUIRED'; end if;
  v_dob := nullif(p_payload->>'date_of_birth','')::date;
  if v_dob is not null and v_dob > (current_date - interval '18 years')
     and coalesce(p_payload->>'guardian_consent','') <> 'true' then
    raise exception 'GUARDIAN_CONSENT_REQUIRED';
  end if;

  v_email := lower(trim(p_payload->>'email'));
  if v_email is null or v_email = '' then raise exception 'EMAIL_REQUIRED'; end if;
  if exists (select 1 from members where event_id = v_link.event_id and lower(email) = v_email) then
    raise exception 'EMAIL_EXISTS';
  end if;

  v_band := nullif(p_payload->>'band_id','')::uuid;
  if v_band is not null and not exists (
       select 1 from list_items where id = v_band and event_id = v_link.event_id
         and kind = 'band' and is_active) then
    raise exception 'INVALID_BAND';
  end if;

  v_group := assign_group(v_link.event_id, v_band);
  v_n := next_counter(v_link.event_id, 'member');
  select to_char(start_date, 'YYYY') into v_year from events where id = v_link.event_id;
  v_code := 'MOSYF-' || v_year || '-' || lpad(v_n::text, 5, '0');

  insert into members (id, event_id, member_code, full_name, email, phone, gender, date_of_birth,
      address, occupation, emergency_contact, photo_path, band_id, church_location_id, church_group_id,
      source, is_first_timer, wants_permanent, convention_group, consent_at, guardian_consent,
      client_created_at)
  values (v_id, v_link.event_id, v_code, trim(p_payload->>'full_name'), v_email,
      nullif(trim(p_payload->>'phone'),''), nullif(p_payload->>'gender',''), v_dob,
      p_payload->>'address', p_payload->>'occupation', p_payload->>'emergency_contact',
      p_payload->>'photo_path', v_band,
      (select id from list_items where id = nullif(p_payload->>'church_location_id','')::uuid
         and event_id = v_link.event_id and kind = 'church_location'),
      (select id from list_items where id = nullif(p_payload->>'church_group_id','')::uuid
         and event_id = v_link.event_id and kind = 'church_group'),
      p_source, coalesce((p_payload->>'is_first_timer')::boolean, false),
      coalesce((p_payload->>'wants_permanent')::boolean, false),
      v_group, now(), coalesce((p_payload->>'guardian_consent')::boolean, false),
      nullif(p_payload->>'client_created_at','')::timestamptz);

  insert into member_departments (member_id, department_id)
  select v_id, li.id from list_items li
  where li.event_id = v_link.event_id and li.kind = 'department'
    and li.id in (select (jsonb_array_elements_text(coalesce(p_payload->'department_ids','[]'::jsonb)))::uuid);

  if v_link.kind = 'executive' then
    v_exec := 'MOSYF-EX-' || v_year || '-' || lpad(next_counter(v_link.event_id, 'executive')::text, 4, '0');
    insert into executive_profiles (member_id, leadership_role, exec_code)
    values (v_id, coalesce(nullif(p_payload->>'leadership_role',''), 'Executive'), v_exec);
  end if;

  update registration_links set uses = uses + 1 where id = v_link.id;
  select status_token into v_token from members where id = v_id;

  insert into email_outbox (event_id, member_id, to_email, payload)
  values (v_link.event_id, v_id, v_email,
          jsonb_build_object('member_code', v_code, 'convention_group', v_group, 'status_token', v_token));
  insert into audit_log (event_id, action, target_type, target_id, details)
  values (v_link.event_id, 'member_registered', 'member', v_id::text,
          jsonb_build_object('source', p_source, 'kind', v_link.kind));

  return jsonb_build_object('member_id', v_id, 'member_code', v_code, 'convention_group', v_group,
                            'status_token', v_token, 'exec_code', v_exec, 'replayed', false);
end $$;

-- ---------- staff operations (idempotent; safe to replay from an offline queue) ----------
create function record_check_in(p_event uuid, p_member uuid, p_method text, p_device text, p_client_event uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_at timestamptz;
begin
  if not (is_admin() or has_convention_role(p_event,
        array['registration_desk','verification_operator']::convention_role_type[])) then
    raise exception 'FORBIDDEN';
  end if;
  if not exists (select 1 from members where id = p_member and event_id = p_event) then
    raise exception 'MEMBER_NOT_FOUND';
  end if;
  insert into attendance (event_id, member_id, method, operator_id, device_id, client_event_id)
  values (p_event, p_member, p_method, auth.uid(), p_device, p_client_event)
  on conflict do nothing returning id, checked_in_at into v_id, v_at;
  if v_id is not null then
    if p_method = 'biometric' then
      update members set biometric_status = 'verified' where id = p_member;
    end if;
    insert into audit_log (event_id, actor_id, action, target_type, target_id)
    values (p_event, auth.uid(), 'check_in', 'member', p_member::text);
    return jsonb_build_object('status', 'ok', 'checked_in_at', v_at);
  end if;
  if exists (select 1 from attendance where client_event_id = p_client_event) then
    return jsonb_build_object('status', 'replayed');
  end if;
  insert into audit_log (event_id, actor_id, action, target_type, target_id, details)
  values (p_event, auth.uid(), 'duplicate_check_in', 'member', p_member::text,
          jsonb_build_object('device', p_device));
  return jsonb_build_object('status', 'already_checked_in',
         'checked_in_at', (select checked_in_at from attendance where event_id = p_event and member_id = p_member));
end $$;

create function claim_resource(p_event uuid, p_member uuid, p_resource resource_type, p_slot text,
                               p_device text, p_client_event uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not (is_admin() or has_convention_role(p_event, case p_resource
        when 'food' then array['food_distributor']::convention_role_type[]
        else array['souvenir_distributor']::convention_role_type[] end)) then
    raise exception 'FORBIDDEN';
  end if;
  if not exists (select 1 from attendance where event_id = p_event and member_id = p_member) then
    raise exception 'NOT_CHECKED_IN';
  end if;
  insert into resource_claims (event_id, member_id, resource, slot, operator_id, device_id, client_event_id)
  values (p_event, p_member, p_resource, coalesce(p_slot,'default'), auth.uid(), p_device, p_client_event)
  on conflict do nothing returning id into v_id;
  if v_id is not null then
    insert into audit_log (event_id, actor_id, action, target_type, target_id, details)
    values (p_event, auth.uid(), 'claim_' || p_resource, 'member', p_member::text,
            jsonb_build_object('slot', p_slot));
    return jsonb_build_object('status', 'ok');
  end if;
  if exists (select 1 from resource_claims where client_event_id = p_client_event) then
    return jsonb_build_object('status', 'replayed');
  end if;
  insert into audit_log (event_id, actor_id, action, target_type, target_id, details)
  values (p_event, auth.uid(), 'duplicate_claim_' || p_resource, 'member', p_member::text,
          jsonb_build_object('slot', p_slot, 'device', p_device));
  return jsonb_build_object('status', 'already_claimed');
end $$;

create function record_participation(p_event uuid, p_activity uuid, p_member uuid, p_client_event uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not (is_admin() or has_convention_role(p_event, array['activity_coordinator']::convention_role_type[])) then
    raise exception 'FORBIDDEN';
  end if;
  insert into activity_participation (event_id, activity_id, member_id, recorded_by, client_event_id)
  values (p_event, p_activity, p_member, auth.uid(), p_client_event)
  on conflict do nothing returning id into v_id;
  return jsonb_build_object('status', case when v_id is not null then 'ok'
    when exists (select 1 from activity_participation where client_event_id = p_client_event) then 'replayed'
    else 'already_recorded' end);
end $$;

-- ---------- personal status portal (public by secret token; no phone/email/address) ----------
create function get_status_by_token(p_token text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'full_name', m.full_name, 'member_code', m.member_code, 'convention_group', m.convention_group,
    'band', (select name from list_items where id = m.band_id),
    'departments', coalesce((select jsonb_agg(li.name) from member_departments md
                             join list_items li on li.id = md.department_id where md.member_id = m.id), '[]'::jsonb),
    'biometric_status', m.biometric_status,
    'checked_in_at', (select checked_in_at from attendance a where a.member_id = m.id and a.event_id = m.event_id),
    'claims', coalesce((select jsonb_agg(jsonb_build_object('resource', c.resource, 'slot', c.slot, 'claimed_at', c.claimed_at))
                        from resource_claims c where c.member_id = m.id), '[]'::jsonb),
    'activities', coalesce((select jsonb_agg(jsonb_build_object('name', ac.name, 'at', p.recorded_at))
                            from activity_participation p join activities ac on ac.id = p.activity_id
                            where p.member_id = m.id), '[]'::jsonb),
    'executive', (select jsonb_build_object('exec_code', e.exec_code, 'leadership_role', e.leadership_role,
                                            'approval', e.approval) from executive_profiles e where e.member_id = m.id))
  from members m where m.status_token = p_token
$$;

-- ---------- triggers ----------
create function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (user_id, email, full_name) values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;  -- role always defaults to 'member'; promote manually
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

create function exec_approval_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.approval is distinct from old.approval then
    new.approved_by := auth.uid();
    new.approved_at := case when new.approval = 'approved' then now() end;
    insert into audit_log (actor_id, action, target_type, target_id, details)
    values (auth.uid(), 'executive_' || new.approval, 'member', new.member_id::text, null);
  end if;
  return new;
end $$;
create trigger exec_approval_guard before update on executive_profiles
  for each row execute function exec_approval_guard();

create function profile_role_audit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role then
    insert into audit_log (actor_id, action, target_type, target_id, details)
    values (auth.uid(), 'role_changed', 'profile', new.user_id::text,
            jsonb_build_object('from', old.role, 'to', new.role));
  end if;
  return new;
end $$;
create trigger profile_role_audit after update on profiles
  for each row execute function profile_role_audit();

-- ---------- row level security ----------
alter table events enable row level security;
alter table profiles enable row level security;
alter table convention_roles enable row level security;
alter table list_items enable row level security;
alter table event_counters enable row level security;
alter table members enable row level security;
alter table member_departments enable row level security;
alter table executive_profiles enable row level security;
alter table registration_links enable row level security;
alter table attendance enable row level security;
alter table resource_claims enable row level security;
alter table programmes enable row level security;
alter table activities enable row level security;
alter table activity_participation enable row level security;
alter table biometric_templates enable row level security;
alter table audit_log enable row level security;
alter table email_outbox enable row level security;
alter table registration_attempts enable row level security;

-- public read (registration form needs these), admin write
create policy events_read on events for select using (true);
create policy events_admin on events for all to authenticated using (is_admin()) with check (is_admin());
create policy lists_read on list_items for select using (true);
create policy lists_admin on list_items for all to authenticated using (is_admin()) with check (is_admin());
create policy programmes_read on programmes for select using (true);
create policy programmes_admin on programmes for all to authenticated using (is_admin()) with check (is_admin());
create policy activities_read on activities for select using (true);
create policy activities_admin on activities for all to authenticated using (is_admin()) with check (is_admin());

create policy profiles_read on profiles for select to authenticated using (user_id = auth.uid() or is_admin());
create policy profiles_super on profiles for update to authenticated using (is_super_admin()) with check (is_super_admin());

create policy croles_read on convention_roles for select to authenticated using (user_id = auth.uid() or is_admin());
create policy croles_admin on convention_roles for all to authenticated using (is_admin()) with check (is_admin());

create policy links_admin on registration_links for all to authenticated using (is_admin()) with check (is_admin());

create policy members_read on members for select to authenticated using (is_staff(event_id));
create policy members_update on members for update to authenticated using (is_admin()) with check (is_admin());
create policy mdept_read on member_departments for select to authenticated
  using (exists (select 1 from members m where m.id = member_id and is_staff(m.event_id)));
create policy exec_read on executive_profiles for select to authenticated
  using (is_admin() or user_id = auth.uid());
create policy exec_update on executive_profiles for update to authenticated using (is_admin()) with check (is_admin());

create policy attendance_read on attendance for select to authenticated using (is_staff(event_id));
create policy claims_read on resource_claims for select to authenticated using (is_staff(event_id));
create policy participation_read on activity_participation for select to authenticated using (is_staff(event_id));
create policy audit_read on audit_log for select to authenticated using (is_admin());
-- no policies on: event_counters, biometric_templates, email_outbox, registration_attempts => service role only

-- ---------- lock down function execution ----------
revoke execute on function register_member(text, jsonb, reg_source) from public, anon, authenticated;
grant execute on function register_member(text, jsonb, reg_source) to service_role;
revoke execute on function record_check_in(uuid, uuid, text, text, uuid) from public, anon;
revoke execute on function claim_resource(uuid, uuid, resource_type, text, text, uuid) from public, anon;
revoke execute on function record_participation(uuid, uuid, uuid, uuid) from public, anon;
grant execute on function record_check_in(uuid, uuid, text, text, uuid) to authenticated;
grant execute on function claim_resource(uuid, uuid, resource_type, text, text, uuid) to authenticated;
grant execute on function record_participation(uuid, uuid, uuid, uuid) to authenticated;
grant execute on function get_status_by_token(text) to anon, authenticated;
revoke execute on function next_counter(uuid, text) from public, anon, authenticated;
revoke execute on function assign_group(uuid, uuid) from public, anon, authenticated;

-- ---------- seed (edit venue before the convention) ----------
insert into events (slug, name, theme, scripture, start_date, end_date, venue, is_active)
values ('mosyf-2026', 'Mountain of Solution Youth Fellowship Convention 2026', 'Walk With Me',
        'Micah 6:8', '2026-10-22', '2026-10-25', 'TBD', true);
insert into list_items (event_id, kind, name, sort_order)
select e.id, 'band', b.n, b.o from events e,
  (values ('Peniel',1),('Judah',2),('Zion',3),('Ephraim',4)) as b(n,o) where e.slug = 'mosyf-2026';
insert into list_items (event_id, kind, name, sort_order)
select e.id, 'department', d.n, d.o from events e,
  (values ('Choir',1),('Usher',2),('Media',3),('Protocol',4),('Drama',5)) as d(n,o) where e.slug = 'mosyf-2026';