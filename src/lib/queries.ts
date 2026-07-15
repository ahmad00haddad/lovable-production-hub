import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const teamQuery = queryOptions({
  queryKey: ["team_members"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("team_members")
      .select("*")
      .order("sort_order");
    if (error) throw error;
    return data;
  },
});

export const tasksQuery = (memberId?: string) =>
  queryOptions({
    queryKey: ["tasks", memberId ?? "all"],
    queryFn: async () => {
      let q = supabase.from("tasks").select("*").order("is_completed").order("created_at");
      if (memberId) q = q.eq("team_member_id", memberId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

export const equipmentQuery = queryOptions({
  queryKey: ["equipment"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("equipment")
      .select("*")
      .order("sort_order")
      .order("created_at");
    if (error) throw error;
    return data;
  },
});
