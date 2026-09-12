-- Restore anon access to finance tables to simplify the app and avoid service_role requirement

GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_entries TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quotations TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quotation_items TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crew_rates TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crew_payments TO anon, authenticated;

-- Restore RLS policies for finance_entries
DROP POLICY IF EXISTS "finance_entries_select" ON public.finance_entries;
DROP POLICY IF EXISTS "finance_entries_insert" ON public.finance_entries;
DROP POLICY IF EXISTS "finance_entries_update" ON public.finance_entries;
DROP POLICY IF EXISTS "finance_entries_delete" ON public.finance_entries;

CREATE POLICY "finance_entries_select" ON public.finance_entries FOR SELECT TO anon, authenticated USING (public.project_exists(project_id));
CREATE POLICY "finance_entries_insert" ON public.finance_entries FOR INSERT TO anon, authenticated WITH CHECK (public.project_exists(project_id));
CREATE POLICY "finance_entries_update" ON public.finance_entries FOR UPDATE TO anon, authenticated USING (public.project_exists(project_id)) WITH CHECK (public.project_exists(project_id));
CREATE POLICY "finance_entries_delete" ON public.finance_entries FOR DELETE TO anon, authenticated USING (public.project_exists(project_id));

-- RLS for quotations
DROP POLICY IF EXISTS "quotations_select" ON public.quotations;
DROP POLICY IF EXISTS "quotations_insert" ON public.quotations;
DROP POLICY IF EXISTS "quotations_update" ON public.quotations;
DROP POLICY IF EXISTS "quotations_delete" ON public.quotations;

CREATE POLICY "quotations_select" ON public.quotations FOR SELECT TO anon, authenticated USING (public.project_exists(project_id));
CREATE POLICY "quotations_insert" ON public.quotations FOR INSERT TO anon, authenticated WITH CHECK (public.project_exists(project_id));
CREATE POLICY "quotations_update" ON public.quotations FOR UPDATE TO anon, authenticated USING (public.project_exists(project_id)) WITH CHECK (public.project_exists(project_id));
CREATE POLICY "quotations_delete" ON public.quotations FOR DELETE TO anon, authenticated USING (public.project_exists(project_id));

-- RLS for quotation_items
DROP POLICY IF EXISTS "quotation_items_select" ON public.quotation_items;
DROP POLICY IF EXISTS "quotation_items_insert" ON public.quotation_items;
DROP POLICY IF EXISTS "quotation_items_update" ON public.quotation_items;
DROP POLICY IF EXISTS "quotation_items_delete" ON public.quotation_items;

CREATE POLICY "quotation_items_select" ON public.quotation_items FOR SELECT TO anon, authenticated USING (public.project_exists(project_id));
CREATE POLICY "quotation_items_insert" ON public.quotation_items FOR INSERT TO anon, authenticated WITH CHECK (public.project_exists(project_id));
CREATE POLICY "quotation_items_update" ON public.quotation_items FOR UPDATE TO anon, authenticated USING (public.project_exists(project_id)) WITH CHECK (public.project_exists(project_id));
CREATE POLICY "quotation_items_delete" ON public.quotation_items FOR DELETE TO anon, authenticated USING (public.project_exists(project_id));

-- RLS for crew_rates
DROP POLICY IF EXISTS "crew_rates_select" ON public.crew_rates;
DROP POLICY IF EXISTS "crew_rates_insert" ON public.crew_rates;
DROP POLICY IF EXISTS "crew_rates_update" ON public.crew_rates;
DROP POLICY IF EXISTS "crew_rates_delete" ON public.crew_rates;

CREATE POLICY "crew_rates_select" ON public.crew_rates FOR SELECT TO anon, authenticated USING (public.project_exists(project_id));
CREATE POLICY "crew_rates_insert" ON public.crew_rates FOR INSERT TO anon, authenticated WITH CHECK (public.project_exists(project_id));
CREATE POLICY "crew_rates_update" ON public.crew_rates FOR UPDATE TO anon, authenticated USING (public.project_exists(project_id)) WITH CHECK (public.project_exists(project_id));
CREATE POLICY "crew_rates_delete" ON public.crew_rates FOR DELETE TO anon, authenticated USING (public.project_exists(project_id));

-- RLS for crew_payments
DROP POLICY IF EXISTS "crew_payments_select" ON public.crew_payments;
DROP POLICY IF EXISTS "crew_payments_insert" ON public.crew_payments;
DROP POLICY IF EXISTS "crew_payments_update" ON public.crew_payments;
DROP POLICY IF EXISTS "crew_payments_delete" ON public.crew_payments;

CREATE POLICY "crew_payments_select" ON public.crew_payments FOR SELECT TO anon, authenticated USING (public.project_exists(project_id));
CREATE POLICY "crew_payments_insert" ON public.crew_payments FOR INSERT TO anon, authenticated WITH CHECK (public.project_exists(project_id));
CREATE POLICY "crew_payments_update" ON public.crew_payments FOR UPDATE TO anon, authenticated USING (public.project_exists(project_id)) WITH CHECK (public.project_exists(project_id));
CREATE POLICY "crew_payments_delete" ON public.crew_payments FOR DELETE TO anon, authenticated USING (public.project_exists(project_id));

-- Ensure finance_pin_hash is readable/writable by anon via get_project/update_project overrides or just directly
CREATE OR REPLACE FUNCTION public.set_finance_pin_hash(_project_id uuid, _hash text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  UPDATE public.projects SET finance_pin_hash = _hash WHERE id = _project_id;
$$;
REVOKE ALL ON FUNCTION public.set_finance_pin_hash(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_finance_pin_hash(uuid, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.update_client_budget(_project_id uuid, _client_budget numeric, _client_name text, _client_due_date date)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  UPDATE public.projects 
  SET client_budget = _client_budget, client_name = _client_name, client_due_date = _client_due_date 
  WHERE id = _project_id;
$$;
REVOKE ALL ON FUNCTION public.update_client_budget(uuid, numeric, text, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_client_budget(uuid, numeric, text, date) TO anon, authenticated;
