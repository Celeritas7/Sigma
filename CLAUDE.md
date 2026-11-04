# Sigma — notes for Claude sessions

Weighted decision-matrix app. Read `README.md` first for layout, backend and deploy.

## Working conventions
- One change per PR, branched from `origin/main`, with a short imperative title. Don't merge; the owner merges.
- `npm test` and `npm run build` must pass before pushing; CI runs both on every PR and deploys `dist/` to GitHub Pages on merge to `main`.
- Verify UI changes in headless Chromium against the **built** `dist/`, with Supabase REST mocked (route `**/rest/v1/**`); the CDNs are blocked in the cloud sandbox, so the dev server can't be used there. Run an axe-core audit on any screen you touch, in **both themes** (Playwright `colorScheme: 'dark'`); it is at 0 failures everywhere. Let dialogs finish their fade-in before auditing (~800 ms) or axe reports false contrast failures.
- Colours: no fixed light-only colours in components. Use the tokens in `src/styles.css` (`:root` and `:root[data-theme="dark"]`); per-hue colours take their lightness from the `--tone-*` tokens (see `kindColor`/`kindText` in `src/lib/theme.js`). White text goes on `--accent-fill` / `--neg-fill`, not `--accent` / `--neg`. `theme.test.js` reads `styles.css` and checks text contrast in both themes; add new text/background pairs there.
- Scoring maths lives in `src/lib/scoring.js` and is unit-tested. Change it with tests.
- Database changes go in `supabase/migrations/` and are applied to the live project separately (SQL Editor or the Supabase MCP). App changes merge first, then the migration, so the live app never breaks.
- Never deploy `cross-check` with JWT verification off; it also checks the user in code.

## State (2026-11-04)
Done today: scoring fixes, owner-only RLS + Google sign-in, cross-check lockdown, tier lanes, layout, phone, accessibility, Vite build + tests + CI, decision icons, record-the-choice on close, look-back on closed decisions (outcome + note, 90-day reminder; `src/lib/lookback.js`), reload-once guard for stale cached pages after a deploy. 2026-11-04: template and close-status migrations applied; the owner confirmed closing a decision and saving a template on the live site. Decision colours used as text go through `kindText` (contrast-tested for every kind in `theme.test.js`). Dark mode: System / Light / Dark in the header's appearance menu (the accent dot), stored in localStorage `sigma_theme`; `index.html` sets `data-theme` before first paint. Templates: New decision opens a picker (blank, six starters in `src/lib/templates.js`, the user's own); "Save as template" on a decision saves its considerations and weights to `sigma_templates` / `sigma_template_parameters`. No Supabase security warnings. Supabase sign-ups are off.

Open:
- Unverified on the live site: the cross-check button, and whether the header clips at the owner's window width.
- Feature backlog: export.

Deploys: Pages is set to deploy from GitHub Actions (switched 2026-11-04). Before that it was set to deploy from the branch, so every merge also ran GitHub's own Jekyll deploy of the raw repo. That deploy usually finished last and served the unbuilt `index.html` (it loads `/src/main.jsx`), which is the "blank page after a deploy" seen on 2026-11-03/04. If a blank page comes back, first check that only "Build and deploy" ran for the merge, not also "pages build and deployment".

Pages' CDN caches the page for up to 10 minutes, so right after a deploy a browser may still get the old page and ask for renamed `/assets/` files. The guard in index.html reloads once when that happens. A hard refresh also works.

## Shared project caveat
Supabase project `wylxvmkcrexwfpjpbhyy` is shared with the owner's other apps. Security findings for those apps belong in their own repos, not here.
