alter table email_outbox add column if not exists provider_message_id text;
alter table email_outbox add column if not exists delivery_status text not null default 'pending';
alter table email_outbox add column if not exists delivered_at timestamptz;
alter table email_outbox add column if not exists last_attempt_at timestamptz;
create index if not exists email_outbox_member_created on email_outbox (member_id, created_at desc);
create table if not exists email_delivery_events (
  id uuid primary key default gen_random_uuid(),
  provider_event_id text unique,
  provider_message_id text not null,
  event_type text not null,
  recipient text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists email_delivery_events_message on email_delivery_events (provider_message_id, created_at desc);
alter table email_delivery_events enable row level security;
