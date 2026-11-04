# Sigma

A weighted decision-matrix tool: list the options you're choosing between and
the considerations that matter, weight the considerations, score each option,
and see which comes out ahead and how robust that lead is.

## Layout

React 18 + Supabase, built with Vite.

| Path | What it is |
|---|---|
| `index.html` | Page shell; Vite injects the built script. |
| `src/main.jsx`, `src/App.jsx` | Startup, app state, data loading and saving. |
| `src/lib/scoring.js` | All the decision maths: weighted totals, ranking, ties, robustness, sensitivity. Tested in `scoring.test.js`. |
| `src/lib/export.js` | CSV export of one decision and the JSON backup of everything. Tested in `export.test.js`. |
| `src/lib/backupImport.js` | Reading a backup file and planning the rows to import. Tested in `backupImport.test.js`. |
| `src/lib/homeFilter.js` | Home's search and filters. Tested in `homeFilter.test.js`. |
| `src/lib/templates.js` | Starter templates and the template ↔ decision conversions. Tested in `templates.test.js`. |
| `src/lib/` | Also the Supabase client, theme colours, small UI helpers. |
| `src/components/` | Shared pieces, header, sign-in. |
| `src/views/` | Home, the decision page (`decision/`), What-if, Blind mode. |
| `supabase/migrations/` | Database changes, in order. |
| `supabase/functions/cross-check/` | Edge Function behind the per-cell "cross-check" button. Asks Claude to challenge one score. |

## Developing

Needs Node 22.12 or newer.

```sh
npm install
npm run dev      # local server with live reload
npm test         # scoring unit tests
npm run build    # production build into dist/
```

## Backend

Supabase project `wylxvmkcrexwfpjpbhyy` (shared with other apps). Tables are
prefixed `sigma_`. Sign-in is Google OAuth; every row is owner-only through
row-level security (`sigma_decisions.user_id = auth.uid()`, children via their
decision).

The page's address must be listed under Authentication → URL Configuration →
Redirect URLs, or Google sign-in returns to a different app.

## Deploying

- **App:** push to `main`. `.github/workflows/deploy.yml` runs the tests, builds, and publishes `dist/` to GitHub Pages. Pull requests run the tests and build without publishing. Pages must be set to deploy from GitHub Actions (Settings → Pages → Source).
- **Database:** run new files in `supabase/migrations/` in the Supabase SQL Editor (or `supabase db push`).
- **cross-check:** `supabase functions deploy cross-check` with JWT verification **on**. It needs the `ANTHROPIC_API_KEY` secret. It takes `{ option_id, parameter_id }`, not a prompt, and reads rows with the caller's token, so it only works on the caller's own decisions.
