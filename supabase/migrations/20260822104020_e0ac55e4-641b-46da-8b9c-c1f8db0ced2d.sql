CREATE POLICY projects_public_insert ON public.projects FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY projects_public_update ON public.projects FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE ON public.projects TO anon, authenticated;
GRANT ALL ON public.projects TO service_role;