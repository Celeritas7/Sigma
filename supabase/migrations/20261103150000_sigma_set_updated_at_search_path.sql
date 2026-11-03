-- Supabase advisor 0011 (function_search_path_mutable): pin the trigger
-- function's search_path so a function lookup can't be redirected by a
-- caller's search_path. It only calls now(), which lives in pg_catalog and
-- is always found, so an empty search_path changes nothing it does.
alter function public.sigma_set_updated_at() set search_path = '';
