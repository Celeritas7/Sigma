# Sigma — notes for Claude sessions

Weighted decision-matrix app. Read `README.md` first for layout, backend and deploy.

## Working conventions
- One change per PR, branched from `origin/main`, with a short imperative title. Don't merge; the owner merges.
- `npm test` and `npm run build` must pass before pushing; CI runs both on every PR and deploys `dist/` to GitHub Pages on merge to `main`.
- Verify UI changes in headless Chromium against the **built** `dist/`, with Supabase REST mocked (route `**/rest/v1/**`); the CDNs are blocked in the cloud sandbox, so the dev server can't be used there. Run an axe-core audit on any screen you touch; it is at 0 failures everywhere.
- Scoring maths lives in `src/lib/scoring.js` and is unit-tested. Change it with tests.
- Database changes go in `supabase/migrations/` and are applied to the live project separately (SQL Editor or the Supabase MCP). App changes merge first, then the migration, so the live app never breaks.
- Never deploy `cross-check` with JWT verification off; it also checks the user in code.

## State (2026-11-03)
Done today: scoring fixes, owner-only RLS + Google sign-in, cross-check lockdown, tier lanes, layout, phone, accessibility, Vite build + tests + CI, decision icons, record-the-choice on close. Sigma has no open bugs and no Supabase security warnings.

Open:
- Unverified on the live site: the cross-check button, and whether the header clips at the owner's window width.
- Dashboard: confirm "Allow new users to sign up" is off (strangers could otherwise use cross-check).
- Feature backlog, in order: look-back on closed decisions (outcome rating + note, check-in reminder), templates (tables `sigma_templates` / `sigma_template_parameters` exist and are empty), dark mode, export.

## Shared project caveat
Supabase project `wylxvmkcrexwfpjpbhyy` is shared with the owner's other apps. Security findings for those apps belong in their own repos, not here.
