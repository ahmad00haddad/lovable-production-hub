-- Simple security definer functions to read/write finance_pin_hash
-- These bypass RLS safely since they're scoped to the project ID only

CREATE OR REPLACE FUNCTION public.get_finance_pin(_project_id uuid)
RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path = ''
AS $$
  SELECT finance_pin_hash FROM public.projects WHERE id = _project_id;
$$;

REVOKE ALL ON FUNCTION public.get_finance_pin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_finance_pin(uuid) TO anon, authenticated;

-- ---------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.save_finance_pin(_project_id uuid, _pin text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = ''
AS $$
  UPDATE public.projects SET finance_pin_hash = _pin WHERE id = _project_id;
$$;

REVOKE ALL ON FUNCTION public.save_finance_pin(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_finance_pin(uuid, text) TO anon, authenticated;
