# Supabase MCP Connection

Use this when the normal `codex` command fails with `Access is denied`.

The WindowsApps Codex launcher can be blocked on this machine:

```powershell
codex mcp login supabase
```

If that happens, use the bundled Codex CLI directly:

```powershell
& 'C:\Users\riega\AppData\Local\OpenAI\Codex\bin\3f4fb8cdd344abc7\codex.exe' mcp add supabase --url 'https://mcp.supabase.com/mcp?project_ref=bfouoswqvgwentswoorl'
```

Then authenticate:

```powershell
& 'C:\Users\riega\AppData\Local\OpenAI\Codex\bin\3f4fb8cdd344abc7\codex.exe' mcp login supabase
```

Expected successful output:

```text
Successfully logged in to MCP server 'supabase'.
```

Verify the MCP server is registered:

```powershell
& 'C:\Users\riega\AppData\Local\OpenAI\Codex\bin\3f4fb8cdd344abc7\codex.exe' mcp list
```

Expected Supabase row:

```text
supabase  https://mcp.supabase.com/mcp?project_ref=bfouoswqvgwentswoorl  enabled  OAuth
```

Optional Supabase skills install:

```powershell
npx skills add supabase/agent-skills
```
