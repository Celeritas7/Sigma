# Paste this into Claude Code, in your `Sigma/` project folder

Claude Code, here's what I need you to do.

## Context

I'm redesigning my decision-tool app **Sigma** (currently `Sigma/index.html`). The new version:

- Replaces the dark editorial UI with a light "Trajectory" theme (Geist, accent green, stacked-bar leaderboard, draggable weight strip).
- Uses the **same Supabase project and tables** — no schema changes required for v1.
- Adds an **AI cross-check button per cell** that asks Claude to push back on my rating.

The cross-check feature needs a Supabase Edge Function (`cross-check`) because the frontend uses an artifact-only helper in preview that doesn't exist in production.

## Files in this bundle

```
Sigma-app.html                                 ← drop-in replacement for index.html
supabase/functions/cross-check/index.ts        ← edge function that proxies to Anthropic
```

## What I want you to do, in order

### 1. Replace the frontend
- Back up my existing `index.html` to `index.html.bak`.
- Replace `index.html` with the contents of `Sigma-app.html` from this bundle.
- Open `index.html` in my browser (or print the local file:// URL).

### 2. Set up Supabase functions locally (if not already)
- Check whether `supabase/` exists in the project root.
  - If not, run `supabase init` (no DB schema generation needed; we already have one).
- Copy `supabase/functions/cross-check/index.ts` from this bundle into the project at the same path.

### 3. Help me deploy the edge function
- Confirm the Supabase CLI is installed (`supabase --version`). If not, give me the install command for my OS.
- Run `supabase login` if I'm not already logged in.
- Link to project `wylxvmkcrexwfpjpbhyy`:
  ```
  supabase link --project-ref wylxvmkcrexwfpjpbhyy
  ```
- **Ask me for my Anthropic API key**, then run:
  ```
  supabase secrets set ANTHROPIC_API_KEY=<my-key>
  ```
  (don't echo the key back to the terminal beyond the necessary command)
- Deploy:
  ```
  supabase functions deploy cross-check --no-verify-jwt
  ```

### 4. Verify it works
- Print the function URL (`https://wylxvmkcrexwfpjpbhyy.supabase.co/functions/v1/cross-check`).
- Test it from the command line with a small payload:
  ```bash
  curl -X POST \
    -H "Content-Type: application/json" \
    -H "apikey: <my-supabase-anon-key>" \
    -H "Authorization: Bearer <my-supabase-anon-key>" \
    -d '{"prompt":"In one sentence, say hello."}' \
    https://wylxvmkcrexwfpjpbhyy.supabase.co/functions/v1/cross-check
  ```
  (the anon key is the one already in `index.html`; you can read it from there)
- Confirm I get back `{"text":"..."}`.

### 5. Open the app and tell me what to try
- Open `index.html` in my default browser.
- Tell me to:
  1. Pick any existing decision.
  2. Drag a slider to score a cell, type a raw value.
  3. Click the `◇ cross-check` button.
  4. Confirm Claude's response appears.

## Important notes

- **Do not change the Supabase URL or anon key** — they're hard-coded in `Sigma-app.html` and point at my real project (`wylxvmkcrexwfpjpbhyy.supabase.co`). Same project the existing app uses.
- **Do not commit my Anthropic key**. It only goes into Supabase secrets via `supabase secrets set`.
- The CORS header in the edge function is `*` for now (fine for local + my personal hosting). If we ever publish this, tighten the origin to my real domain.
- If the deploy fails because I'm not on a paid Supabase plan, edge functions are free — but a project paused for inactivity needs to be unpaused first. Let me know if that's the issue.

## After it works, ask me if I want to do the optional schema bumps

These add features that need DB columns the app doesn't have yet:

```sql
-- 1. Confidence dots per score
alter table sigma_scores add column confidence smallint;

-- 2. Decision journal (notes-to-self per decision)
create table sigma_journal (
  id uuid primary key default gen_random_uuid(),
  decision_id uuid references sigma_decisions(id) on delete cascade,
  text text not null,
  created_at timestamptz default now()
);

-- 3. Lock in a pick when closing
alter table sigma_decisions add column picked_option_id uuid references sigma_options(id);
alter table sigma_decisions add column closed_at timestamptz;
```

If I say yes to any of those, run the SQL via `supabase db push` (or paste it into the Supabase dashboard SQL editor for me to run manually), then come back to my Claude.ai session and tell me the migration ran — I'll wire the UI from there.

Thanks!
