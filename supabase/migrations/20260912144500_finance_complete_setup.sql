-- ============================================
-- FINANCE MODULE: COMPLETE DATABASE SETUP
-- Run this ENTIRE SQL block in Lovable SQL Editor
-- ============================================

-- 1. Finance PINs table (simple, separate from projects)
CREATE TABLE IF NOT EXISTS public.finance_pins (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE UNIQUE,
  pin text NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.finance_pins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "finance_pins_all" ON public.finance_pins;
CREATE POLICY "finance_pins_all" ON public.finance_pins
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
GRANT ALL ON public.finance_pins TO anon, authenticated;

-- 2. Ensure finance tables are accessible by anon
GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_entries TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quotations TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quotation_items TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crew_rates TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crew_payments TO anon, authenticated;

-- 3. Open RLS on all finance tables
ALTER TABLE public.finance_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crew_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crew_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fe_all" ON public.finance_entries;
CREATE POLICY "fe_all" ON public.finance_entries FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "q_all" ON public.quotations;
CREATE POLICY "q_all" ON public.quotations FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "qi_all" ON public.quotation_items;
CREATE POLICY "qi_all" ON public.quotation_items FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "cr_all" ON public.crew_rates;
CREATE POLICY "cr_all" ON public.crew_rates FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "cp_all" ON public.crew_payments;
CREATE POLICY "cp_all" ON public.crew_payments FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 4. RPCs to safely read/write project finance fields (bypass projects RLS)
CREATE OR REPLACE FUNCTION public.get_project_finance(_project_id uuid)
RETURNS json LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  SELECT json_build_object(
    'id', p.id, 'name', p.name,
    'client_budget', p.client_budget,
    'client_name', p.client_name,
    'client_due_date', p.client_due_date,
    'start_date', p.start_date,
    'end_date', p.end_date
  ) FROM public.projects p WHERE p.id = _project_id;
$$;
REVOKE ALL ON FUNCTION public.get_project_finance(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_project_finance(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.update_project_finance(
  _project_id uuid, _client_budget numeric, _client_name text, _client_due_date date
) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  UPDATE public.projects
  SET client_budget = _client_budget, client_name = _client_name, client_due_date = _client_due_date
  WHERE id = _project_id;
$$;
REVOKE ALL ON FUNCTION public.update_project_finance(uuid, numeric, text, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_project_finance(uuid, numeric, text, date) TO anon, authenticated;
