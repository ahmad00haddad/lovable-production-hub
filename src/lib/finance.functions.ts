import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";

/* ------------------------------------------------------------------ */
/* Reads                                                               */
/* ------------------------------------------------------------------ */

export const getFinanceOverview = createServerFn({ method: "POST" })
  .inputValidator((data: { projectId: string }) => data)
  .handler(async ({ data }) => {
    const p = data.projectId;

    // Project data via RPC (bypasses projects table RLS)
    let projectData: any = null;
    const pRes = await supabase.rpc("get_project_finance", { _project_id: p });
    if (!pRes.error) projectData = pRes.data;

    const [days, entries, rates, payments, members] = await Promise.all([
      supabase
        .from("call_sheets")
        .select("id, title, shoot_date, call_time, location_name, day_budget")
        .eq("project_id", p)
        .order("shoot_date", { ascending: true, nullsFirst: false }),
      supabase
        .from("finance_entries")
        .select("*")
        .eq("project_id", p)
        .order("entry_date", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false }),
      supabase
        .from("crew_rates")
        .select("*")
        .eq("project_id", p)
        .order("sort_order")
        .order("created_at"),
      supabase
        .from("crew_payments")
        .select("*")
        .eq("project_id", p)
        .order("paid_on", { ascending: false }),
      supabase
        .from("team_members")
        .select("id, name, role")
        .eq("project_id", p)
        .order("sort_order"),
    ]);

    for (const r of [days, entries, rates, payments, members]) {
      if (r.error) throw r.error;
    }

    return {
      project: projectData,
      days: days.data ?? [],
      entries: entries.data ?? [],
      rates: rates.data ?? [],
      payments: payments.data ?? [],
      members: members.data ?? [],
    };
  });

export const getQuotationsList = createServerFn({ method: "POST" })
  .inputValidator((data: { projectId: string }) => data)
  .handler(async ({ data }) => {
    const { data: rows, error } = await supabase
      .from("quotations")
      .select("*")
      .eq("project_id", data.projectId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return rows ?? [];
  });

export const getQuotationDetail = createServerFn({ method: "POST" })
  .inputValidator((data: { projectId: string; quoteId: string }) => data)
  .handler(async ({ data }) => {
    const [quote, items] = await Promise.all([
      supabase
        .from("quotations")
        .select("*")
        .eq("id", data.quoteId)
        .eq("project_id", data.projectId)
        .maybeSingle(),
      supabase
        .from("quotation_items")
        .select("*")
        .eq("project_id", data.projectId)
        .eq("quotation_id", data.quoteId)
        .order("sort_order")
        .order("created_at"),
    ]);
    if (quote.error) throw quote.error;
    if (items.error) throw items.error;
    return { quote: quote.data, items: items.data ?? [] };
  });

/* ------------------------------------------------------------------ */
/* Writes                                                              */
/* ------------------------------------------------------------------ */

const ALLOWED: Record<string, string[]> = {
  finance_entries: [
    "entry_type", "title", "category", "amount", "currency", "entry_date",
    "party", "is_paid", "notes", "call_sheet_id", "team_member_id", "paid_by", "due_date",
  ],
  crew_rates: [
    "team_member_id", "person_name", "role", "rate_type", "rate", "days", "currency", "notes", "sort_order",
  ],
  crew_payments: ["crew_rate_id", "amount", "paid_on", "method", "paid_by", "notes"],
  quotations: [
    "title", "quote_number", "client_name", "client_contact", "issue_date", "valid_until",
    "currency", "tax_percent", "discount", "status", "notes", "terms", "contract_body",
    "signature_name", "signed_at",
  ],
  quotation_items: ["quotation_id", "description", "quantity", "unit_price", "sort_order"],
  call_sheets: ["day_budget"],
  projects: ["client_budget", "client_name", "client_due_date"],
};

type WriteInput = {
  projectId: string;
  table: keyof typeof ALLOWED | string;
  action: "insert" | "update" | "delete";
  id?: string;
  values?: Record<string, unknown>;
};

function sanitize(table: string, values: Record<string, unknown> | undefined) {
  const allowed = ALLOWED[table];
  if (!allowed) throw new Error("TABLE_NOT_ALLOWED");
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(values ?? {})) {
    if (allowed.includes(k)) out[k] = v;
  }
  return out;
}

async function assertBelongs(table: string, id: unknown, projectId: string) {
  if (typeof id !== "string" || !id) throw new Error("BAD_PARENT");
  const { data: row, error } = await supabase
    .from(table as any)
    .select("id")
    .eq("id", id)
    .eq("project_id", projectId)
    .maybeSingle();
  if (error) throw error;
  if (!row) throw new Error("PARENT_NOT_IN_PROJECT");
}

export const financeWrite = createServerFn({ method: "POST" })
  .inputValidator((data: WriteInput) => data)
  .handler(async ({ data }) => {
    if (!ALLOWED[data.table]) throw new Error("TABLE_NOT_ALLOWED");
    const values = sanitize(data.table, data.values);

    if (data.action === "insert") {
      if (data.table === "call_sheets" || data.table === "projects") throw new Error("NOT_ALLOWED");

      // Foreign keys must belong to the same project.
      if (data.table === "crew_payments") {
        await assertBelongs("crew_rates", values["crew_rate_id"], data.projectId);
      }
      if (data.table === "quotation_items") {
        await assertBelongs("quotations", values["quotation_id"], data.projectId);
      }
      if (values["call_sheet_id"]) {
        await assertBelongs("call_sheets", values["call_sheet_id"], data.projectId);
      }
      if (values["team_member_id"]) {
        await assertBelongs("team_members", values["team_member_id"], data.projectId);
      }

      const { data: row, error } = await supabase
        .from(data.table as any)
        .insert({ ...values, project_id: data.projectId } as any)
        .select("id")
        .single();
      if (error) throw error;
      return row as unknown as { id: string };
    }

    if (!data.id) throw new Error("ID_REQUIRED");

    if (data.action === "update") {
      if (data.table === "projects") {
        const budgetStr = String(values["client_budget"] ?? "0").replace(/,/g, "");
        let budget = Number(budgetStr);
        if (!Number.isFinite(budget) || budget < 0) budget = 0;

        const rawName = values["client_name"];
        const clientName = typeof rawName === "string" && rawName.trim() !== "" ? rawName.trim() : null;
        const rawDue = values["client_due_date"];
        const dueDate = typeof rawDue === "string" && rawDue !== "" ? rawDue : null;

        const { error } = await supabase.rpc("update_project_finance", {
          _project_id: data.projectId,
          _client_budget: budget,
          _client_name: clientName as unknown as string,
          _client_due_date: dueDate as unknown as string,
        });
        if (error) throw error;
        return { id: data.id };
      }

      if (values["call_sheet_id"]) {
        await assertBelongs("call_sheets", values["call_sheet_id"], data.projectId);
      }
      if (values["team_member_id"]) {
        await assertBelongs("team_members", values["team_member_id"], data.projectId);
      }

      const { error } = await supabase
        .from(data.table as any)
        .update(values as any)
        .eq("id", data.id)
        .eq("project_id", data.projectId);
      if (error) throw error;
      return { id: data.id };
    }

    if (data.table === "projects" || data.table === "call_sheets") throw new Error("NOT_ALLOWED");
    const { error } = await supabase
      .from(data.table as any)
      .delete()
      .eq("id", data.id)
      .eq("project_id", data.projectId);
    if (error) throw error;
    return { id: data.id };
  });
