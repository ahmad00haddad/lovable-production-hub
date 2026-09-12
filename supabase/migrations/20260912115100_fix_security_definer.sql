-- Fix security definer functions by revoking from PUBLIC and setting strict search_path

-- 1. get_project
ALTER FUNCTION public.get_project(uuid) SET search_path = '';
REVOKE ALL ON FUNCTION public.get_project(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_project(uuid) TO anon, authenticated, service_role;

-- 2. resolve_project_code
ALTER FUNCTION public.resolve_project_code(text) SET search_path = '';
REVOKE ALL ON FUNCTION public.resolve_project_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_project_code(text) TO anon, authenticated, service_role;

-- 3. create_project
ALTER FUNCTION public.create_project(text, date, date) SET search_path = '';
REVOKE ALL ON FUNCTION public.create_project(text, date, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_project(text, date, date) TO anon, authenticated, service_role;

-- 4. update_project
ALTER FUNCTION public.update_project(uuid, text, date, date) SET search_path = '';
REVOKE ALL ON FUNCTION public.update_project(uuid, text, date, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_project(uuid, text, date, date) TO anon, authenticated, service_role;

-- 5. project_exists
ALTER FUNCTION public.project_exists(uuid) SET search_path = '';
REVOKE ALL ON FUNCTION public.project_exists(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.project_exists(uuid) TO anon, authenticated, service_role;

-- 6. set_updated_at (trigger function)
ALTER FUNCTION public.set_updated_at() SET search_path = '';
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC;
-- Trigger functions typically don't need EXECUTE grants for normal roles as they are invoked by the system,
-- but we grant it to service_role just in case.
GRANT EXECUTE ON FUNCTION public.set_updated_at() TO service_role;
