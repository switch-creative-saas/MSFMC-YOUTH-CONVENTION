# Supabase Setup

The portal uses Supabase when `VITE_DATA_BACKEND=supabase`, which is the default. Set these values in `.env.local`:

```env
VITE_DATA_BACKEND=supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_publishable_anon_key
```

The current Vite configuration also accepts `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` from an existing local environment file and exposes only those public values to the browser. Never add `SUPABASE_SECRET_KEY` or a service-role key to client code or `.env.example`.

Apply [001_init.sql](../supabase/migrations/001_init.sql) in the Supabase SQL editor. Disable public email signup before creating staff accounts.

Create staff users from the Supabase Authentication dashboard. The profile trigger creates a `profiles` row with the `member` role. Promote the account using the SQL editor:

```sql
update profiles
set role = 'super_admin'
where email = 'admin@example.com';
```

Use `admin` or `executive` instead of `super_admin` for the other staff account types. Convention-specific staff access belongs in `convention_roles` and is enforced by the database policies.

## Edge function

Deploy the public registration boundary after setting `SUPABASE_SERVICE_ROLE_KEY` as a Supabase project secret:

```sh
supabase functions deploy register
```

The browser calls `register` with a registration-link token and consented payload. The function alone invokes `register_member`, which validates the link, prevents duplicate emails, assigns the convention group, and creates the member or executive record atomically.

Staff attendance, resource claims, and activity participation use the idempotent database RPCs with a client-generated UUID. The temporary distribution slot is `default`; configurable slots need the separate settings migration requested for a later pass.

Run the app locally with `npm run dev`. Run `npm run build` before deployment. To use the legacy local repository during isolated UI work, set `VITE_DATA_BACKEND=local`.
