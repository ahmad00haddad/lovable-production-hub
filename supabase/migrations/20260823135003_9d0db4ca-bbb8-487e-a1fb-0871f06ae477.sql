CREATE TABLE public.finance_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  entry_type text NOT NULL DEFAULT 'expense',
  title text NOT NULL,
  category text NOT NULL DEFAULT 'أخرى',
  amount numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'JOD',
  entry_date date,
  party text,
  is_paid boolean NOT NULL DEFAULT false,
  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_entries TO anon, authenticated;
GRANT ALL ON public.finance_entries TO service_role;
ALTER TABLE public.finance_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY finance_entries_select ON public.finance_entries FOR SELECT TO anon, authenticated USING (public.project_exists(project_id));
CREATE POLICY finance_entries_insert ON public.finance_entries FOR INSERT TO anon, authenticated WITH CHECK (public.project_exists(project_id));
CREATE POLICY finance_entries_update ON public.finance_entries FOR UPDATE TO anon, authenticated USING (public.project_exists(project_id)) WITH CHECK (public.project_exists(project_id));
CREATE POLICY finance_entries_delete ON public.finance_entries FOR DELETE TO anon, authenticated USING (public.project_exists(project_id));
CREATE TRIGGER finance_entries_updated_at BEFORE UPDATE ON public.finance_entries FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX finance_entries_project_idx ON public.finance_entries(project_id);

CREATE TABLE public.quotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  quote_number text,
  title text NOT NULL DEFAULT 'عرض سعر',
  client_name text,
  client_contact text,
  issue_date date DEFAULT CURRENT_DATE,
  valid_until date,
  currency text NOT NULL DEFAULT 'JOD',
  tax_percent numeric(5,2) NOT NULL DEFAULT 0,
  discount numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  notes text,
  terms text,
  contract_body text,
  signature_name text,
  signed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.quotations TO anon, authenticated;
GRANT ALL ON public.quotations TO service_role;
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
CREATE POLICY quotations_select ON public.quotations FOR SELECT TO anon, authenticated USING (public.project_exists(project_id));
CREATE POLICY quotations_insert ON public.quotations FOR INSERT TO anon, authenticated WITH CHECK (public.project_exists(project_id));
CREATE POLICY quotations_update ON public.quotations FOR UPDATE TO anon, authenticated USING (public.project_exists(project_id)) WITH CHECK (public.project_exists(project_id));
CREATE POLICY quotations_delete ON public.quotations FOR DELETE TO anon, authenticated USING (public.project_exists(project_id));
CREATE TRIGGER quotations_updated_at BEFORE UPDATE ON public.quotations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX quotations_project_idx ON public.quotations(project_id);

CREATE TABLE public.quotation_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  quotation_id uuid NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity numeric(10,2) NOT NULL DEFAULT 1,
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.quotation_items TO anon, authenticated;
GRANT ALL ON public.quotation_items TO service_role;
ALTER TABLE public.quotation_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY quotation_items_select ON public.quotation_items FOR SELECT TO anon, authenticated USING (public.project_exists(project_id));
CREATE POLICY quotation_items_insert ON public.quotation_items FOR INSERT TO anon, authenticated WITH CHECK (public.project_exists(project_id));
CREATE POLICY quotation_items_update ON public.quotation_items FOR UPDATE TO anon, authenticated USING (public.project_exists(project_id)) WITH CHECK (public.project_exists(project_id));
CREATE POLICY quotation_items_delete ON public.quotation_items FOR DELETE TO anon, authenticated USING (public.project_exists(project_id));
CREATE TRIGGER quotation_items_updated_at BEFORE UPDATE ON public.quotation_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX quotation_items_quotation_idx ON public.quotation_items(quotation_id);