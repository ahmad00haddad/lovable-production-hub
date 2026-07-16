import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const projectQuery = (projectId: string) => queryOptions({
  queryKey: ["project", projectId],
  queryFn: async () => {
    const { data, error } = await supabase.from("projects").select("*").eq("id", projectId).single();
    if (error) throw error;
    return data;
  }
});

export const teamQuery = (projectId: string) => queryOptions({
  queryKey: ["team_members", projectId],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("team_members")
      .select("*")
      .eq("project_id", projectId)
      .order("sort_order");
    if (error) throw error;
    return data;
  },
});

export const tasksQuery = (projectId: string, memberId?: string) =>
  queryOptions({
    queryKey: ["tasks", projectId, memberId ?? "all"],
    queryFn: async () => {
      let q = supabase.from("tasks").select("*").eq("project_id", projectId).order("is_completed").order("created_at");
      if (memberId) q = q.eq("team_member_id", memberId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

export const equipmentQuery = (projectId: string) => queryOptions({
  queryKey: ["equipment", projectId],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("equipment")
      .select("*")
      .eq("project_id", projectId)
      .order("sort_order")
      .order("created_at");
    if (error) throw error;
    return data;
  },
});

export const activityLogQuery = (projectId: string) => queryOptions({
  queryKey: ["activity_log", projectId],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("activity_log")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(10);
    if (error) throw error;
    return data;
  },
});
