-- Private convention assets. Service-role edge functions are the only writers/readers.
insert into storage.buckets (id, name, public)
values ('mosyf-private', 'mosyf-private', false)
on conflict (id) do nothing;

-- Configure these two Vault secrets once in the SQL editor; values are intentionally never committed:
-- select vault.create_secret('https://YOUR_PROJECT.supabase.co', 'mosyf_project_url');
-- select vault.create_secret('YOUR_SERVICE_ROLE_KEY', 'mosyf_service_role_key');
create extension if not exists pg_cron;
create extension if not exists pg_net;

do $$
declare project_url text; service_key text;
begin
  select decrypted_secret into project_url from vault.decrypted_secrets where name = 'mosyf_project_url';
  select decrypted_secret into service_key from vault.decrypted_secrets where name = 'mosyf_service_role_key';
  if project_url is null or service_key is null then
    raise notice 'Email worker schedule skipped: add mosyf_project_url and mosyf_service_role_key to Vault, then rerun this block.';
    return;
  end if;
  if exists (select 1 from cron.job where jobname = 'mosyf-send-registration-email') then
    perform cron.unschedule((select jobid from cron.job where jobname = 'mosyf-send-registration-email' limit 1));
  end if;
  perform cron.schedule('mosyf-send-registration-email', '*/5 * * * *', format(
    'select net.http_post(url := %L, headers := %L::jsonb, body := ''{}''::jsonb)',
    project_url || '/functions/v1/send-registration-email',
    jsonb_build_object('Authorization', 'Bearer ' || service_key)::text
  ));
end $$;
