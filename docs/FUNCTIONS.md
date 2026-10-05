# Supabase Edge Functions

## Register

Deploy the Edge Functions:

```sh
supabase functions deploy register
supabase functions deploy upload-url
supabase functions deploy send-registration-email
```

Set server-only secrets before deploying. Do not put any of these values in `.env.local`, `.env.example`, or frontend code:

```sh
supabase secrets set RESEND_API_KEY=... EMAIL_FROM="MOSYF Convention <noreply@example.org>" APP_URL=https://portal.example.org RATE_LIMIT_SALT=... ALLOWED_ORIGIN=https://portal.example.org
```

`SUPABASE_SERVICE_ROLE_KEY` is supplied by the Supabase platform runtime. The function reads it only from its server environment.

Apply [002_storage_and_email_schedule.sql](../supabase/migrations/002_storage_and_email_schedule.sql) after `001_init.sql`. It creates the private asset bucket and schedules the email worker every five minutes when the two named Vault values exist. Add the project URL and service-role key to Vault first, then rerun the migration block if it reported that scheduling was skipped. This keeps the schedule authorization secret out of source control.

## Smoke test

Use the script below after deployment. It sends six valid-shaped attempts using a chosen forwarded IP. The sixth response must be `429` and include `Retry-After`.

```powershell
./scripts/test-register-rate-limit.ps1 -FunctionUrl https://YOUR_PROJECT.supabase.co/functions/v1/register -Token YOUR_LINK_TOKEN
```

The token must be an active registration link. Reusing the same payload UUID after a successful registration is safe: the database RPC returns the original member and does not add a second outbox row.

For the other registration contracts:

```powershell
./scripts/test-register-duplicate-email.ps1 -FunctionUrl https://YOUR_PROJECT.supabase.co/functions/v1/register -FirstToken FIRST_ACTIVE_LINK -SecondToken SECOND_ACTIVE_LINK
./scripts/test-register-replay.ps1 -FunctionUrl https://YOUR_PROJECT.supabase.co/functions/v1/register -Token ACTIVE_LINK
```

## Email worker verification

Run the worker with the service-role bearer token from a secure server environment:

```sh
curl -X POST "$SUPABASE_URL/functions/v1/send-registration-email" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

To simulate a Resend `429`, point `RESEND_API_KEY` at a test key or intercept the Resend endpoint in a local function test. The worker stops immediately and leaves the current and remaining rows `pending` when Resend responds with `429`.
