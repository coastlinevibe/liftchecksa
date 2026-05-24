# Supabase Connection

This workspace is wired to the hosted Liftcheck Supabase project:

- Project name: `liftcheck-sa`
- Project ref: `bfouoswqvgwentswoorl`
- Project URL: `https://bfouoswqvgwentswoorl.supabase.co`

## App env connection

The app connects through env vars, not hardcoded credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://bfouoswqvgwentswoorl.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

These are read by the Supabase client/server helpers in `lib/supabase`.

## Codex MCP connection

The working Codex MCP setup is project-scoped and uses a bearer token:

```powershell
codex mcp add supabase --url "https://mcp.supabase.com/mcp?project_ref=bfouoswqvgwentswoorl" --bearer-token-env-var SUPABASE_ACCESS_TOKEN
```

Expected `codex mcp list` row:

```text
supabase  https://mcp.supabase.com/mcp?project_ref=bfouoswqvgwentswoorl  SUPABASE_ACCESS_TOKEN  enabled  Bearer token
```

`codex mcp login supabase` is not the working path in this environment. The CLI OAuth flow reports `No authorization support detected`, so use the bearer-token config above instead.

## Direct DB access that works here

There are two different Supabase access paths in this Codex environment:

1. The account-scoped Supabase app connector can still fail with `MCP error -32600: You do not have permission to perform this action`.
2. The project-wired MCP SQL executor does work and can query the hosted database directly.

Example direct DB check:

```sql
select id, user_id, first_name, surname, role, membership_status
from public.profiles
order by created_at desc nulls last
limit 20;
```

Use that project-wired MCP SQL path when you need real table data instead of the public REST/anon-key view.

## Token source

Create a Supabase access token at:

`https://supabase.com/dashboard/account/tokens`

Store it as `SUPABASE_ACCESS_TOKEN` for the Codex process. In this workspace, the local `codex.cmd` launcher may inject it because shell-level env writes can be isolated by the sandbox account.

## Local TLS note

This machine uses Avast HTTPS scanning, which re-signs TLS certificates. The project uses `scripts/next-with-local-ca.cjs` so `npm run dev`, `npm run build`, and `npm run start` trust the exported Avast root certificate instead of disabling TLS verification globally.

Do not use:

```text
NODE_TLS_REJECT_UNAUTHORIZED=0
```
