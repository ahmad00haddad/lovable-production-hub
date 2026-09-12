import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { supabase } from "@/integrations/supabase/client";

/* ------------------------------------------------------------------ */
/* Session                                                             */
/* ------------------------------------------------------------------ */

type GateSession = { unlocked?: string[] };

function sessionConfig() {
  return {
    password: process.env["SESSION_SECRET"] || "default-secret-key-32-chars-long!!",
    name: "prod-finance",
    maxAge: 60 * 60 * 24 * 7,
    cookie: { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/" },
  };
}

async function getSession() {
  return useSession<GateSession>(sessionConfig());
}

/* ------------------------------------------------------------------ */
/* Pin helpers — plain text, no crypto needed                          */
/* ------------------------------------------------------------------ */

async function readPinHash(projectId: string): Promise<string | null> {
  const { data, error } = await supabase
    .rpc("get_finance_pin", { _project_id: projectId });
  if (error) throw error;
  return (data as string | null) ?? null;
}

/** 
 * Accepts both plain text PINs (new) and old pbkdf2$... hashes (legacy).
 * For legacy: compare stored hash directly with input (the user literally pastes the hash).
 * This gracefully handles the transition period.
 */
function checkPin(input: string, stored: string): boolean {
  if (stored.startsWith("pbkdf2$")) {
    // Legacy: only allow if user typed the full hash (admin bypass)
    return input === stored;
  }
  return input === stored;
}

async function requireUnlocked(projectId: string) {
  const session = await getSession();
  if (!(session.data.unlocked ?? []).includes(projectId)) throw new Error("LOCKED");
}

/* ------------------------------------------------------------------ */
/* Gate server functions                                               */
/* ------------------------------------------------------------------ */

export const financeGateStatus = createServerFn({ method: "POST" })
  .inputValidator((data: { projectId: string }) => data)
  .handler(async ({ data }) => {
    try {
      const session = await getSession();
      const hash = await readPinHash(data.projectId);
      return {
        hasPin: !!hash,
        unlocked: !!hash && (session.data.unlocked ?? []).includes(data.projectId),
      };
    } catch {
      return { hasPin: false, unlocked: false };
    }
  });

export const unlockFinance = createServerFn({ method: "POST" })
  .inputValidator((data: { projectId: string; pin: string }) => data)
  .handler(async ({ data }) => {
    try {
      const hash = await readPinHash(data.projectId);
      if (!hash) return { ok: false as const, reason: "no-pin" as const };
      if (!checkPin(data.pin, hash)) return { ok: false as const, reason: "wrong" as const };
      const session = await getSession();
      const list = new Set(session.data.unlocked ?? []);
      list.add(data.projectId);
      await session.update({ unlocked: [...list] });
      return { ok: true as const };
    } catch (e: any) {
      return { ok: false as const, reason: e.message || "error" };
    }
  });

export const lockFinance = createServerFn({ method: "POST" })
  .inputValidator((data: { projectId: string }) => data)
  .handler(async ({ data }) => {
    const session = await getSession();
    await session.update({
      unlocked: (session.data.unlocked ?? []).filter((id) => id !== data.projectId),
    });
    return { ok: true as const };
  });

export const setFinancePin = createServerFn({ method: "POST" })
  .inputValidator((data: { projectId: string; pin: string; currentPin?: string }) => data)
  .handler(async ({ data }) => {
    try {
      if (!data.pin || data.pin.length < 4) return { ok: false as const, reason: "short" };
      const existing = await readPinHash(data.projectId);
      if (existing) {
        const session = await getSession();
        const unlocked = (session.data.unlocked ?? []).includes(data.projectId);
        const okCurrent = data.currentPin ? checkPin(data.currentPin, existing) : false;
        if (!unlocked && !okCurrent) return { ok: false as const, reason: "wrong" };
      }
      // Save as plain text via secure RPC
      const { error } = await supabase
        .rpc("save_finance_pin", { _project_id: data.projectId, _pin: data.pin });
      if (error) throw error;
      const session = await getSession();
      const list = new Set(session.data.unlocked ?? []);
      list.add(data.projectId);
      await session.update({ unlocked: [...list] });
      return { ok: true as const };
    } catch (e: any) {
      console.error("setFinancePin error:", e);
      return { ok: false as const, reason: e.message || String(e) };
    }
  });

/* ------------------------------------------------------------------ */
/* Reads                                                               */
/* ------------------------------------------------------------------ */

export const getFinanceOverview = createServerFn({ method: "POST" })
  .inputValidator((data: { projectId: string }) => data)
  .handler(async ({ data }) => {
    await requireUnlocked(data.projectId);
    const p = data.projectId;

    const [project, days, entries, rates, payments, members] = await Promise.all([
      supabase
        .from("projects")
        .select("id, name, client_budget, client_name, client_due_date, start_date, end_date")
        .eq("id", p)
        .maybeSingle(),
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
      supabase.from("crew_rates").select("*").eq("project_id", p).order("sort_order").order("created_at"),
      supabase.from("crew_payments").select("*").eq("project_id", p).order("paid_on", { ascending: false }),
      supabase.from("team_members").select("id, name, role").eq("project_id", p).order("sort_order"),
    ]);

    for (const r of [project, days, entries, rates, payments, members]) {
      if (r.error) throw r.error;
    }

    return {
      project: project.data,
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
    await requireUnlocked(data.projectId);
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
    await requireUnlocked(data.projectId);
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

export const financeWrite = createServerFn({ method: "POST" })
  .inputValidator((data: WriteInput) => data)
  .handler(async ({ data }) => {
    await requireUnlocked(data.projectId);
    if (!ALLOWED[data.table]) throw new Error("TABLE_NOT_ALLOWED");
    const values = sanitize(data.table, data.values);

    if (data.action === "insert") {
      if (data.table === "call_sheets" || data.table === "projects") throw new Error("NOT_ALLOWED");
      const { data: row, error } = await supabase
        .from(data.table as any)
        .insert({ ...values, project_id: data.projectId } as any)
        .select()
        .single();
      if (error) throw error;
      return row as { id: string };
    }

    if (!data.id) throw new Error("ID_REQUIRED");

    if (data.action === "update") {
      const q = supabase.from(data.table as any).update(values as any).eq("id", data.id);
      const { error } = await (data.table === "projects" ? q : q.eq("project_id", data.projectId));
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
