-- Look-back on closed decisions: how did the choice turn out?
-- Nullable, so the running app is unaffected until it starts writing them.
-- The owner-only RLS policy on sigma_decisions covers these columns.
alter table public.sigma_decisions
  add column if not exists outcome text
    check (outcome in ('good', 'mixed', 'regret')),
  add column if not exists outcome_notes text,
  add column if not exists reviewed_at timestamptz;
