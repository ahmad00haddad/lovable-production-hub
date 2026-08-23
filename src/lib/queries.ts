import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const projectQuery = (projectId: string) => queryOptions({
  queryKey: ["project", projectId],
  queryFn: async () => {
    const { data, error } = await supabase
      .rpc("get_project", { _project_id: projectId })
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("PROJECT_NOT_FOUND");
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

export const callSheetsQuery = (projectId: string) => queryOptions({
  queryKey: ["call_sheets", projectId],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("call_sheets")
      .select("*")
      .eq("project_id", projectId)
      .order("shoot_date", { ascending: true, nullsFirst: false })
      .order("created_at");
    if (error) throw error;
    return data;
  },
});

export const callSheetQuery = (projectId: string, callSheetId: string) => queryOptions({
  queryKey: ["call_sheet", projectId, callSheetId],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("call_sheets")
      .select("*")
      .eq("id", callSheetId)
      .eq("project_id", projectId)
      .maybeSingle();
    if (error) throw error;
    return data;
  },
});

export const shotsQuery = (projectId: string, callSheetId: string) => queryOptions({
  queryKey: ["shots", projectId, callSheetId],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("shots")
      .select("*")
      .eq("project_id", projectId)
      .eq("call_sheet_id", callSheetId)
      .order("sort_order")
      .order("created_at");
    if (error) throw error;
    return data;
  },
});

export const financeQuery = (projectId: string) => queryOptions({
  queryKey: ["finance_entries", projectId],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("finance_entries")
      .select("*")
      .eq("project_id", projectId)
      .order("entry_date", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
});

export const quotationsQuery = (projectId: string) => queryOptions({
  queryKey: ["quotations", projectId],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("quotations")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
});

export const quotationQuery = (projectId: string, quoteId: string) => queryOptions({
  queryKey: ["quotation", projectId, quoteId],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("quotations")
      .select("*")
      .eq("id", quoteId)
      .eq("project_id", projectId)
      .maybeSingle();
    if (error) throw error;
    return data;
  },
});

export const quotationItemsQuery = (projectId: string, quoteId: string) => queryOptions({
  queryKey: ["quotation_items", projectId, quoteId],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("quotation_items")
      .select("*")
      .eq("project_id", projectId)
      .eq("quotation_id", quoteId)
      .order("sort_order")
      .order("created_at");
    if (error) throw error;
    return data;
  },
});
