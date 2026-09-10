-- 1) Project-level finance gate + client budget
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS finance_pin_hash text,
  ADD COLUMN IF NOT EXISTS client_budget numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS client_name text,
  ADD COLUMN IF NOT EXISTS client_due_date date;

-- 2) Per shoot-day budget
ALTER TABLE public.call_sheets
  ADD COLUMN IF NOT EXISTS day_budget numeric NOT NULL DEFAULT 0;

-- 3) Richer finance entries
ALTER TABLE public.finance_entries
  ADD COLUMN IF NOT EXISTS call_sheet_id uuid REFERENCES public.call_sheets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS team_member_id uuid REFERENCES public.team_members(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS paid_by text NOT NULL DEFAULT 'project',
  ADD COLUMN IF NOT EXISTS due_date date;

-- 4) Crew rates
CREATE TABLE IF NOT EXISTS public.crew_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  team_member_id uuid REFERENCES public.team_members(id) ON DELETE SET NULL,
  person_name text NOT NULL,
  role text,
  rate_type text NOT NULL DEFAULT 'day',
  rate numeric NOT NULL DEFAULT 0,
  days numeric NOT NULL DEFAULT 1,
  currency text NOT NULL DEFAULT 'JOD',
  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.crew_rates TO service_role;
ALTER TABLE public.crew_rates ENABLE ROW LEVEL SECURITY;

-- 5) Crew payments
CREATE TABLE IF NOT EXISTS public.crew_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  crew_rate_id uuid NOT NULL REFERENCES public.crew_rates(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  paid_on date NOT NULL DEFAULT CURRENT_DATE,
  method text,
  paid_by text NOT NULL DEFAULT 'project',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.crew_payments TO service_role;
ALTER TABLE public.crew_payments ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER crew_rates_updated_at BEFORE UPDATE ON public.crew_rates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER crew_payments_updated_at BEFORE UPDATE ON public.crew_payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS crew_rates_project_idx ON public.crew_rates(project_id);
CREATE INDEX IF NOT EXISTS crew_payments_project_idx ON public.crew_payments(project_id);
CREATE INDEX IF NOT EXISTS finance_entries_call_sheet_idx ON public.finance_entries(call_sheet_id);

-- 6) Lock all financial data away from the browser: server-only access
DROP POLICY IF EXISTS finance_entries_select ON public.finance_entries;
DROP POLICY IF EXISTS finance_entries_insert ON public.finance_entries;
DROP POLICY IF EXISTS finance_entries_update ON public.finance_entries;
DROP POLICY IF EXISTS finance_entries_delete ON public.finance_entries;
DROP POLICY IF EXISTS quotations_select ON public.quotations;
DROP POLICY IF EXISTS quotations_insert ON public.quotations;
DROP POLICY IF EXISTS quotations_update ON public.quotations;
DROP POLICY IF EXISTS quotations_delete ON public.quotations;
DROP POLICY IF EXISTS quotation_items_select ON public.quotation_items;
DROP POLICY IF EXISTS quotation_items_insert ON public.quotation_items;
DROP POLICY IF EXISTS quotation_items_update ON public.quotation_items;
DROP POLICY IF EXISTS quotation_items_delete ON public.quotation_items;

REVOKE ALL ON public.finance_entries FROM anon, authenticated;
REVOKE ALL ON public.quotations FROM anon, authenticated;
REVOKE ALL ON public.quotation_items FROM anon, authenticated;
REVOKE ALL ON public.crew_rates FROM anon, authenticated;
REVOKE ALL ON public.crew_payments FROM anon, authenticated;

GRANT ALL ON public.finance_entries TO service_role;
GRANT ALL ON public.quotations TO service_role;
GRANT ALL ON public.quotation_items TO service_role;