alter table events add column if not exists claim_slots jsonb not null default '[]'::jsonb;
