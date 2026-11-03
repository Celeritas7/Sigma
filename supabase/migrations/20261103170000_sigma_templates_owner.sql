-- Templates: let a user save a decision's considerations and start new
-- decisions from them.
--
-- sigma_templates / sigma_template_parameters exist, are empty, and have RLS
-- on with no policies (all access denied). Starter templates ship in the app
-- (src/lib/templates.js), so these tables only hold each user's own.
--
-- Safe in either order with the app: before this runs, the app still shows
-- the starters, and saving a template fails with a visible error.

-- 1. owner column (tables are empty, so not null is safe) ---------------------
alter table public.sigma_templates
  add column if not exists user_id uuid default auth.uid()
    references auth.users (id) on delete cascade;
alter table public.sigma_templates alter column user_id set not null;
create index if not exists sigma_templates_user_id_idx on public.sigma_templates (user_id);
create index if not exists sigma_template_parameters_template_id_idx on public.sigma_template_parameters (template_id);

-- One template per type made sense for system templates; users may save
-- several of the same kind (two "job" templates, say).
alter table public.sigma_templates drop constraint if exists sigma_templates_type_key;

-- 2. owner policies -----------------------------------------------------------
drop policy if exists sigma_templates_owner on public.sigma_templates;
create policy sigma_templates_owner on public.sigma_templates
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists sigma_template_parameters_owner on public.sigma_template_parameters;
create policy sigma_template_parameters_owner on public.sigma_template_parameters
  for all to authenticated
  using (exists (select 1 from public.sigma_templates t
                 where t.id = template_id and t.user_id = (select auth.uid())))
  with check (exists (select 1 from public.sigma_templates t
                      where t.id = template_id and t.user_id = (select auth.uid())));
