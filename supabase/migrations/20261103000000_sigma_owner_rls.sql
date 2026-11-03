-- Sigma: scope every row to its owner.
--
-- Before this, each sigma_* table had a single policy `ALL ... using (true)`
-- for every role, so anyone holding the public key (it ships in index.html)
-- could read, change or delete every decision.
--
-- After: a decision belongs to the signed-in user who created it, and
-- options / parameters / scores are reachable only through a decision the
-- user owns. Same `user_id = auth.uid()` pattern as the other apps here.

-- 1. owner column -------------------------------------------------------------
alter table public.sigma_decisions
  add column if not exists user_id uuid references auth.users (id) on delete cascade;

-- existing decisions all belong to the app's one user
update public.sigma_decisions
  set user_id = (select id from auth.users where email = 'mangaonkaraniket@gmail.com')
  where user_id is null;

alter table public.sigma_decisions
  alter column user_id set default auth.uid(),
  alter column user_id set not null;

create index if not exists sigma_decisions_user_id_idx on public.sigma_decisions (user_id);

-- 2. drop the open policies ---------------------------------------------------
drop policy if exists sigma_decisions_all           on public.sigma_decisions;
drop policy if exists sigma_options_all             on public.sigma_options;
drop policy if exists sigma_parameters_all          on public.sigma_parameters;
drop policy if exists sigma_scores_all              on public.sigma_scores;
drop policy if exists sigma_templates_all           on public.sigma_templates;
drop policy if exists sigma_template_parameters_all on public.sigma_template_parameters;

-- 3. owner policies -----------------------------------------------------------
create policy sigma_decisions_owner on public.sigma_decisions
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy sigma_options_owner on public.sigma_options
  for all to authenticated
  using (exists (select 1 from public.sigma_decisions d
                 where d.id = decision_id and d.user_id = (select auth.uid())))
  with check (exists (select 1 from public.sigma_decisions d
                      where d.id = decision_id and d.user_id = (select auth.uid())));

create policy sigma_parameters_owner on public.sigma_parameters
  for all to authenticated
  using (exists (select 1 from public.sigma_decisions d
                 where d.id = decision_id and d.user_id = (select auth.uid())))
  with check (exists (select 1 from public.sigma_decisions d
                      where d.id = decision_id and d.user_id = (select auth.uid())));

-- A score must hang off an option AND a parameter the user owns, so nobody
-- can attach a score to someone else's parameter by guessing its id.
create policy sigma_scores_owner on public.sigma_scores
  for all to authenticated
  using (exists (select 1 from public.sigma_options o
                 join public.sigma_decisions d on d.id = o.decision_id
                 where o.id = option_id and d.user_id = (select auth.uid())))
  with check (
    exists (select 1 from public.sigma_options o
            join public.sigma_decisions d on d.id = o.decision_id
            where o.id = option_id and d.user_id = (select auth.uid()))
    and exists (select 1 from public.sigma_parameters p
                join public.sigma_decisions d on d.id = p.decision_id
                where p.id = parameter_id and d.user_id = (select auth.uid())));

-- Templates aren't used by the app yet (both tables are empty). Leave RLS on
-- with no policies, which denies all access until they're needed.
