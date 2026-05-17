# Sigma — Deployment bundle for Claude Code

This folder contains everything Claude Code needs to deploy the Sigma redesign.

## How to use

1. **Download this folder** and unzip somewhere on your machine.
2. Open a terminal **inside your existing `Sigma/` project folder** (the one that has the current `index.html`).
3. Open Claude Code in that same folder.
4. Copy the entire contents of `CLAUDE_CODE_PROMPT.md` from this bundle and **paste it into Claude Code**.
5. Claude Code will walk you through the steps, ask for your Anthropic API key when needed, and verify everything works.

## Files

| File | What it is |
|---|---|
| `CLAUDE_CODE_PROMPT.md` | The prompt to paste into Claude Code. Has step-by-step deploy instructions + verification commands. |
| `Sigma-app.html` | Drop-in replacement for `Sigma/index.html`. Same Supabase, new UI + slider + cross-check. |
| `supabase/functions/cross-check/index.ts` | Edge Function that proxies cross-check requests to the Anthropic API. |

## What you'll need before starting

- **Supabase CLI** installed (Claude Code will tell you the install command if not).
- **Logged in to Supabase** (`supabase login`).
- **An Anthropic API key** — get one at https://console.anthropic.com → API Keys. ~$0.001 per cross-check on Haiku.

## Time estimate

About 10 minutes if the Supabase CLI is already set up. About 15 minutes if you're installing it for the first time.
