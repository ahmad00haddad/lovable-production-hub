
-- PROJECTS: enable RLS, public read only
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.projects TO anon, authenticated;
GRANT ALL ON public.projects TO service_role;
CREATE POLICY "projects_public_read" ON public.projects FOR SELECT TO anon, authenticated USING (true);

-- Helper: check project exists (avoids trivial USING (true))
CREATE OR REPLACE FUNCTION public.project_exists(_project_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.projects WHERE id = _project_id)
$$;
GRANT EXECUTE ON FUNCTION public.project_exists(uuid) TO anon, authenticated;

-- TEAM_MEMBERS
DROP POLICY IF EXISTS "public rw team_members" ON public.team_members;
CREATE POLICY "team_members_select" ON public.team_members FOR SELECT TO anon, authenticated USING (public.project_exists(project_id));
CREATE POLICY "team_members_insert" ON public.team_members FOR INSERT TO anon, authenticated WITH CHECK (public.project_exists(project_id));
CREATE POLICY "team_members_update" ON public.team_members FOR UPDATE TO anon, authenticated USING (public.project_exists(project_id)) WITH CHECK (public.project_exists(project_id));
CREATE POLICY "team_members_delete" ON public.team_members FOR DELETE TO anon, authenticated USING (public.project_exists(project_id));

-- TASKS
DROP POLICY IF EXISTS "public rw tasks" ON public.tasks;
CREATE POLICY "tasks_select" ON public.tasks FOR SELECT TO anon, authenticated USING (public.project_exists(project_id));
CREATE POLICY "tasks_insert" ON public.tasks FOR INSERT TO anon, authenticated WITH CHECK (public.project_exists(project_id));
CREATE POLICY "tasks_update" ON public.tasks FOR UPDATE TO anon, authenticated USING (public.project_exists(project_id)) WITH CHECK (public.project_exists(project_id));
CREATE POLICY "tasks_delete" ON public.tasks FOR DELETE TO anon, authenticated USING (public.project_exists(project_id));

-- EQUIPMENT
DROP POLICY IF EXISTS "public rw equipment" ON public.equipment;
CREATE POLICY "equipment_select" ON public.equipment FOR SELECT TO anon, authenticated USING (public.project_exists(project_id));
CREATE POLICY "equipment_insert" ON public.equipment FOR INSERT TO anon, authenticated WITH CHECK (public.project_exists(project_id));
CREATE POLICY "equipment_update" ON public.equipment FOR UPDATE TO anon, authenticated USING (public.project_exists(project_id)) WITH CHECK (public.project_exists(project_id));
CREATE POLICY "equipment_delete" ON public.equipment FOR DELETE TO anon, authenticated USING (public.project_exists(project_id));

-- ACTIVITY_LOG: append + read only (no update/delete)
DROP POLICY IF EXISTS "public i activity" ON public.activity_log;
DROP POLICY IF EXISTS "public r activity" ON public.activity_log;
CREATE POLICY "activity_log_select" ON public.activity_log FOR SELECT TO anon, authenticated USING (public.project_exists(project_id));
CREATE POLICY "activity_log_insert" ON public.activity_log FOR INSERT TO anon, authenticated WITH CHECK (public.project_exists(project_id));
