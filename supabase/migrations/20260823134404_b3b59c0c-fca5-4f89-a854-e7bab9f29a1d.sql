-- 1) Lock down direct access to projects table (prevents enumeration of ids/short codes)
DROP POLICY IF EXISTS projects_public_read ON public.projects;
DROP POLICY IF EXISTS projects_public_insert ON public.projects;
DROP POLICY IF EXISTS projects_public_update ON public.projects;

REVOKE ALL ON public.projects FROM anon, authenticated;
GRANT ALL ON public.projects TO service_role;

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- 2) project_exists must keep working now that projects is not readable directly
CREATE OR REPLACE FUNCTION public.project_exists(_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (SELECT 1 FROM public.projects WHERE id = _project_id)
$$;

-- 3) Capability-based accessors: you must already know the project id or its short code
CREATE OR REPLACE FUNCTION public.get_project(_project_id uuid)
RETURNS SETOF public.projects
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT * FROM public.projects WHERE id = _project_id
$$;

CREATE OR REPLACE FUNCTION public.resolve_project_code(_short_code text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT id FROM public.projects WHERE upper(short_code) = upper(btrim(_short_code)) LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.create_project(_name text, _start_date date DEFAULT NULL, _end_date date DEFAULT NULL)
RETURNS SETOF public.projects
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _code text;
  _try int := 0;
BEGIN
  IF _name IS NULL OR btrim(_name) = '' OR length(_name) > 120 THEN
    RAISE EXCEPTION 'invalid project name';
  END IF;

  LOOP
    _try := _try + 1;
    _code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    BEGIN
      RETURN QUERY
      INSERT INTO public.projects (name, short_code, start_date, end_date)
      VALUES (btrim(_name), _code, _start_date, _end_date)
      RETURNING *;
      RETURN;
    EXCEPTION WHEN unique_violation THEN
      IF _try >= 5 THEN RAISE; END IF;
    END;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_project(_project_id uuid, _name text, _start_date date DEFAULT NULL, _end_date date DEFAULT NULL)
RETURNS SETOF public.projects
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  UPDATE public.projects
     SET name = COALESCE(NULLIF(btrim(_name), ''), name),
         start_date = _start_date,
         end_date = _end_date,
         updated_at = now()
   WHERE id = _project_id
  RETURNING *
$$;

REVOKE ALL ON FUNCTION public.get_project(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.resolve_project_code(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_project(text, date, date) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_project(uuid, text, date, date) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.project_exists(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_project(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.resolve_project_code(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_project(text, date, date) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_project(uuid, text, date, date) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.project_exists(uuid) TO anon, authenticated, service_role;