# Sigma — notes for Claude sessions

Weighted decision-matrix app. Read `README.md` first for layout, backend and deploy.

## Working conventions
- One change per PR, branched from `origin/main`, with a short imperative title. Don't merge; the owner merges.
- `npm test` and `npm run build` must pass before pushing; CI runs both on every PR and deploys `dist/` to GitHub Pages on merge to `main`.
- Verify UI changes in headless Chromium against the **built** `dist/`, with Supabase REST mocked (route `**/rest/v1/**`); the CDNs are blocked in the cloud sandbox, so the dev server can't be used there. Run an axe-core audit on any screen you touch; it is at 0 failures everywhere.
- Scoring maths lives in `src/lib/scoring.js` and is unit-tested. Change it with tests.
- Database changes go in `supabase/migrations/` and are applied to the live project separately (SQL Editor or the Supabase MCP). App changes merge first, then the migration, so the live app never breaks.
- Never deploy `cross-check` with JWT verification off; it also checks the user in code.

## State (2026-11-04)
Done today: scoring fixes, owner-only RLS + Google sign-in, cross-check lockdown, tier lanes, layout, phone, accessibility, Vite build + tests + CI, decision icons, record-the-choice on close, look-back on closed decisions (outcome + note, 90-day reminder; `src/lib/lookback.js`), reload-once guard for stale cached pages after a deploy. Templates: New decision opens a picker (blank, six starters in `src/lib/templates.js`, the user's own); "Save as template" on a decision saves its considerations and weights to `sigma_templates` / `sigma_template_parameters`. No Supabase security warnings. Supabase sign-ups are off.

Open:
- Unverified on the live site: the cross-check button, and whether the header clips at the owner's window width.
- Unconfirmed by hand on the live site (needs the owner's sign-in): closing a decision and saving a template. Both migrations, `20261103170000_sigma_templates_owner.sql` and `20261103180000_sigma_status_closed.sql`, were applied 2026-11-04 and checked in the database. Closing failed before the second one, because the status check didn't allow `'closed'`.
- Home row number for 🏠 decisions is 4.12:1 contrast (needs 4.5:1).
- Feature backlog, in order: dark mode, export.

Note: after a deploy, a browser holding the cached page may show a blank page once; the guard in index.html reloads it. A hard refresh also works.

## Shared project caveat
Supabase project `wylxvmkcrexwfpjpbhyy` is shared with the owner's other apps. Security findings for those apps belong in their own repos, not here.
