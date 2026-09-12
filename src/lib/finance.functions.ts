import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";

/* ------------------------------------------------------------------ */
/* Session gate                                                        */
/* ------------------------------------------------------------------ */

type GateSession = { unlocked?: string[] };

function sessionConfig() {
  return {
    password: process.env["SESSION_SECRET"] || "default-secret-key-32-chars-long!",
    name: "prod-finance",
    maxAge: 60 * 60 * 24 * 7,
    cookie: { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/" },
  };
}

async function getSession() {
  return useSession<GateSession>(sessionConfig());
}

function toB64(bytes: Uint8Array) {
  let s = "";
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s);
}

function fromB64(value: string) {
  const bin = atob(value);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

const ITERATIONS = 120000;

async function derive(pin: string, salt: Uint8Array) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as unknown as BufferSource, iterations: ITERATIONS, hash: "SHA-256" },
    key,
    256,
  );
  return new Uint8Array(bits);
}

async function hashPin(pin: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(pin, salt);
  return `pbkdf2$${ITERATIONS}$${toB64(salt)}$${toB64(hash)}`;
}

async function verifyPin(pin: string, stored: string) {
  const parts = stored.split("$");
  if (parts.length !== 4 || !parts[2] || !parts[3]) return false;
  const salt = fromB64(parts[2]);
  const expected = fromB64(parts[3]);
  const actual = await derive(pin, salt);
  if (actual.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < actual.length; i++) diff |= actual[i]! ^ expected[i]!;
  return diff === 0;
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function readPinHash(projectId: string) {
  const db = await admin();
  const { data, error } = await db
    .from("projects")
    .select("finance_pin_hash")
    .eq("id", projectId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("PROJECT_NOT_FOUND");
  return (data as { finance_pin_hash: string | null }).finance_pin_hash;
}

async function requireUnlocked(projectId: string) {
  const session = await getSession();
  const hash = await readPinHash(projectId);
  // No pin set yet: the producer must set one before any data is exposed.
  if (!hash) throw new Error("NO_PIN");
  if (!(session.data.unlocked ?? []).includes(projectId)) throw new Error("LOCKED");
}

/* ------------------------------------------------------------------ */
/* Gate server functions                                               */
/* ------------------------------------------------------------------ */

export const financeGateStatus = createServerFn({ method: "POST" })
  .inputValidator((data: { projectId: string }) => data)
  .handler(async ({ data }) => {
    const session = await getSession();
    const hash = await readPinHash(data.projectId);
    return {
      hasPin: !!hash,
      unlocked: !!hash && (session.data.unlocked ?? []).includes(data.projectId),
    };
  });

export const unlockFinance = createServerFn({ method: "POST" })
  .inputValidator((data: { projectId: string; pin: string }) => data)
  .handler(async ({ data }) => {
    const hash = await readPinHash(data.projectId);
    if (!hash) return { ok: false as const, reason: "no-pin" as const };
    if (!(await verifyPin(data.pin, hash))) return { ok: false as const, reason: "wrong" as const };
    const session = await getSession();
    const list = new Set(session.data.unlocked ?? []);
    list.add(data.projectId);
    await session.update({ unlocked: [...list] });
    return { ok: true as const };
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
      if (!data.pin || data.pin.length < 4) return { ok: false as const, reason: "short" as const };
      const existing = await readPinHash(data.projectId);
      if (existing) {
        const session = await getSession();
        const unlocked = (session.data.unlocked ?? []).includes(data.projectId);
        const okCurrent = data.currentPin ? await verifyPin(data.currentPin, existing) : false;
        if (!unlocked && !okCurrent) return { ok: false as const, reason: "wrong" as const };
      }
      const db = await admin();
      const { error } = await db
        .from("projects")
        .update({ finance_pin_hash: await hashPin(data.pin) } as never)
        .eq("id", data.projectId);
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
    const db = await admin();
    const p = data.projectId;

    const [project, days, entries, rates, payments, members] = await Promise.all([
      db
        .from("projects")
        .select("id, name, client_budget, client_name, client_due_date, start_date, end_date")
        .eq("id", p)
        .maybeSingle(),
      db
        .from("call_sheets")
        .select("id, title, shoot_date, call_time, location_name, day_budget")
        .eq("project_id", p)
        .order("shoot_date", { ascending: true, nullsFirst: false }),
      db
        .from("finance_entries")
        .select("*")
        .eq("project_id", p)
        .order("entry_date", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false }),
      db.from("crew_rates").select("*").eq("project_id", p).order("sort_order").order("created_at"),
      db.from("crew_payments").select("*").eq("project_id", p).order("paid_on", { ascending: false }),
      db.from("team_members").select("id, name, role").eq("project_id", p).order("sort_order"),
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
    const db = await admin();
    const { data: rows, error } = await db
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
    const db = await admin();
    const [quote, items] = await Promise.all([
      db
        .from("quotations")
        .select("*")
        .eq("id", data.quoteId)
        .eq("project_id", data.projectId)
        .maybeSingle(),
      db
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
    const db = await admin();
    const values = sanitize(data.table, data.values);

    if (data.action === "insert") {
      if (data.table === "call_sheets" || data.table === "projects") throw new Error("NOT_ALLOWED");
      const { data: row, error } = await db
        .from(data.table as never)
        .insert({ ...values, project_id: data.projectId } as never)
        .select()
        .single();
      if (error) throw error;
      return row as { id: string };
    }

    if (!data.id) throw new Error("ID_REQUIRED");

    if (data.action === "update") {
      const q = db.from(data.table as never).update(values as never).eq("id", data.id);
      const { error } = await (data.table === "projects" ? q : q.eq("project_id", data.projectId));
      if (error) throw error;
      return { id: data.id };
    }

    if (data.table === "projects" || data.table === "call_sheets") throw new Error("NOT_ALLOWED");
    const { error } = await db
      .from(data.table as never)
      .delete()
      .eq("id", data.id)
      .eq("project_id", data.projectId);
    if (error) throw error;
    return { id: data.id };
  });
