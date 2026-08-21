CREATE TABLE public.call_sheets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  shoot_date date,
  call_time text,
  wrap_time text,
  location_name text,
  location_address text,
  lat double precision,
  lng double precision,
  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.call_sheets TO anon, authenticated;
GRANT ALL ON public.call_sheets TO service_role;
ALTER TABLE public.call_sheets ENABLE ROW LEVEL SECURITY;

CREATE POLICY call_sheets_select ON public.call_sheets FOR SELECT TO anon, authenticated USING (project_exists(project_id));
CREATE POLICY call_sheets_insert ON public.call_sheets FOR INSERT TO anon, authenticated WITH CHECK (project_exists(project_id));
CREATE POLICY call_sheets_update ON public.call_sheets FOR UPDATE TO anon, authenticated USING (project_exists(project_id)) WITH CHECK (project_exists(project_id));
CREATE POLICY call_sheets_delete ON public.call_sheets FOR DELETE TO anon, authenticated USING (project_exists(project_id));

CREATE TRIGGER call_sheets_updated_at BEFORE UPDATE ON public.call_sheets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.shots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  call_sheet_id uuid REFERENCES public.call_sheets(id) ON DELETE CASCADE,
  scene text,
  description text NOT NULL,
  shot_size text,
  movement text,
  storyboard_url text,
  notes text,
  is_done boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.shots TO anon, authenticated;
GRANT ALL ON public.shots TO service_role;
ALTER TABLE public.shots ENABLE ROW LEVEL SECURITY;

CREATE POLICY shots_select ON public.shots FOR SELECT TO anon, authenticated USING (project_exists(project_id));
CREATE POLICY shots_insert ON public.shots FOR INSERT TO anon, authenticated WITH CHECK (project_exists(project_id));
CREATE POLICY shots_update ON public.shots FOR UPDATE TO anon, authenticated USING (project_exists(project_id)) WITH CHECK (project_exists(project_id));
CREATE POLICY shots_delete ON public.shots FOR DELETE TO anon, authenticated USING (project_exists(project_id));

CREATE TRIGGER shots_updated_at BEFORE UPDATE ON public.shots FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX shots_call_sheet_idx ON public.shots(call_sheet_id, sort_order);
CREATE INDEX call_sheets_project_idx ON public.call_sheets(project_id, shoot_date);

ALTER TABLE public.call_sheets REPLICA IDENTITY FULL;
ALTER TABLE public.shots REPLICA IDENTITY FULL;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.call_sheets;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.shots;
EXCEPTION WHEN OTHERS THEN NULL; END $$;