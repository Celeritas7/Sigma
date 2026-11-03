-- Let a decision be closed.
--
-- The app closes a decision by setting status = 'closed' (App.jsx,
-- closeDecision), and Home, the decision page and the look-back all read
-- 'closed'. The live check constraint only allowed active / decided /
-- archived, so every close was rejected and the app showed "Couldn't save
-- the decision". 'decided' is unused but kept, so no existing row or older
-- client can break.
alter table public.sigma_decisions drop constraint if exists sigma_decisions_status_check;
alter table public.sigma_decisions add constraint sigma_decisions_status_check
  check (status in ('active', 'closed', 'decided', 'archived'));
