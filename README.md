# Sigma

A weighted decision-matrix tool: list the options you're choosing between and
the considerations that matter, weight the considerations, score each option,
and see which comes out ahead and how robust that lead is.

## Layout

| Path | What it is |
|---|---|
| `index.html` | The whole app: React 18 + Supabase client, JSX compiled in the browser by Babel. Served as a static page. |
| `supabase/migrations/` | Database changes, in order. |
| `supabase/functions/cross-check/` | Edge Function behind the per-cell "cross-check" button. Asks Claude to challenge one score. |

## Backend

Supabase project `wylxvmkcrexwfpjpbhyy` (shared with other apps). Tables are
prefixed `sigma_`. Sign-in is Google OAuth; every row is owner-only through
row-level security (`sigma_decisions.user_id = auth.uid()`, children via their
decision).

The page's address must be listed under Authentication → URL Configuration →
Redirect URLs, or Google sign-in returns to a different app.

## Deploying

- **App:** push to `main`.
- **Database:** run new files in `supabase/migrations/` in the Supabase SQL Editor (or `supabase db push`).
- **cross-check:** `supabase functions deploy cross-check` with JWT verification **on**. It needs the `ANTHROPIC_API_KEY` secret. It takes `{ option_id, parameter_id }`, not a prompt, and reads rows with the caller's token, so it only works on the caller's own decisions.
