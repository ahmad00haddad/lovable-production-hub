import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { FinanceGate, useFinanceLock } from "@/components/FinanceGate";
import { financeOverviewQuery } from "@/lib/finance-queries";
import { financeWrite } from "@/lib/finance.functions";
import {
  Plus, Wallet, TrendingUp, TrendingDown, Trash2, CheckCircle2, Circle,
  ChevronLeft, FileText, X, Lock, CalendarDays, Users, HandCoins, Save,
} from "lucide-react";

export const Route = createFileRoute("/p/$projectId/finance")({
  head: () => ({
    meta: [
      { title: "الإنتاج المالي — ميزانية وأيام التصوير" },
      { name: "description", content: "قسم محمي بكلمة سر لإدارة ميزانية العميل ومصاريف كل يوم تصوير وأسعار الطاقم والمستحقات." },
      { property: "og:title", content: "الإنتاج المالي" },
      { property: "og:description", content: "ميزانية العميل، مصاريف كل يوم تصوير، أسعار الطاقم، والمستحقات في مكان واحد محمي." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FinancePage,
});

const CATEGORIES = ["معدات", "طاقم", "مواصلات", "طعام", "مواقع", "ما بعد الإنتاج", "تسويق", "أخرى"];
const PAID_BY = [
  ["producer", "من جيبي"],
  ["project", "كاش المشروع"],
  ["client", "العميل مباشرة"],
] as const;

const input = "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-amber-500/50";

function money(n: number, currency: string) {
  return `${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

function FinancePage() {
  const { projectId } = Route.useParams();
  return (
    <FinanceGate projectId={projectId}>
      <FinanceInner projectId={projectId} />
    </FinanceGate>
  );
}

type Tab = "overview" | "days" | "crew" | "entries";

function FinanceInner({ projectId }: { projectId: string }) {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("overview");
  const { data, isLoading } = useQuery(financeOverviewQuery(projectId, true));
  const write = useServerFn(financeWrite);
  const lock = useFinanceLock(projectId);

  const refresh = () => qc.invalidateQueries({ queryKey: ["finance-overview", projectId] });

  const mutate = useMutation({
    mutationFn: (vars: Parameters<typeof financeWrite>[0]["data"]) => write({ data: vars }),
    onSuccess: () => refresh(),
    onError: () => toast.error("تعذر الحفظ"),
  });

  if (isLoading || !data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
      </div>
    );
  }

  const entries = data.entries as Array<Record<string, any>>;
  const days = data.days as Array<Record<string, any>>;
  const rates = data.rates as Array<Record<string, any>>;
  const payments = data.payments as Array<Record<string, any>>;
  const project = (data.project ?? {}) as Record<string, any>;
  const currency = (entries[0]?.["currency"] as string) ?? "JOD";

  const income = entries.filter((e) => e["entry_type"] === "income").reduce((s, e) => s + Number(e["amount"]), 0);
  const incomeReceived = entries.filter((e) => e["entry_type"] === "income" && e["is_paid"]).reduce((s, e) => s + Number(e["amount"]), 0);
  const expense = entries.filter((e) => e["entry_type"] === "expense").reduce((s, e) => s + Number(e["amount"]), 0);
  const outOfPocket = entries
    .filter((e) => e["entry_type"] === "expense" && e["paid_by"] === "producer")
    .reduce((s, e) => s + Number(e["amount"]), 0);
  const clientBudget = Number(project["client_budget"] ?? 0);

  const rateTotal = (r: Record<string, any>) =>
    r["rate_type"] === "flat" ? Number(r["rate"]) : Number(r["rate"]) * Number(r["days"] || 0);
  const paidFor = (rateId: string) =>
    payments.filter((p) => p["crew_rate_id"] === rateId).reduce((s, p) => s + Number(p["amount"]), 0);
  const crewTotal = rates.reduce((s, r) => s + rateTotal(r), 0);
  const crewPaid = rates.reduce((s, r) => s + paidFor(r["id"] as string), 0);
  const crewDue = crewTotal - crewPaid;
  const receivable = Math.max(clientBudget - incomeReceived, 0);
  const profit = clientBudget - expense - crewDue - (crewPaid ? 0 : 0);

  const dayActual = (dayId: string) =>
    entries
      .filter((e) => e["call_sheet_id"] === dayId && e["entry_type"] === "expense")
      .reduce((s, e) => s + Number(e["amount"]), 0);

  const TABS: Array<[Tab, string]> = [
    ["overview", "نظرة عامة"],
    ["days", "أيام التصوير"],
    ["crew", "الطاقم والأسعار"],
    ["entries", "الحركات"],
  ];

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pb-28 pt-8">
      <header className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black">الإنتاج المالي</h1>
          <p className="mt-1 text-xs text-muted-foreground">ميزانية العميل، مصاريف كل يوم، وأسعار الطاقم.</p>
        </div>
        <button
          onClick={() => lock.mutate()}
          className="mt-1 inline-flex shrink-0 items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-bold text-muted-foreground"
        >
          <Lock size={12} /> قفل
        </button>
      </header>

      <div className="mb-5 flex gap-2 overflow-x-auto">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-bold transition ${
              tab === key ? "bg-amber-gradient text-black" : "border border-white/10 bg-white/5 text-muted-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <OverviewTab
          projectId={projectId}
          project={project}
          currency={currency}
          clientBudget={clientBudget}
          expense={expense}
          income={income}
          incomeReceived={incomeReceived}
          receivable={receivable}
          outOfPocket={outOfPocket}
          crewDue={crewDue}
          profit={profit}
          onSave={(values) => mutate.mutate({ projectId, table: "projects", action: "update", id: projectId, values })}
        />
      )}

      {tab === "days" && (
        <DaysTab
          projectId={projectId}
          days={days}
          currency={currency}
          dayActual={dayActual}
          onBudget={(id, day_budget) =>
            mutate.mutate({ projectId, table: "call_sheets", action: "update", id, values: { day_budget } })
          }
        />
      )}

      {tab === "crew" && (
        <CrewTab
          projectId={projectId}
          rates={rates}
          members={data.members as Array<Record<string, any>>}
          currency={currency}
          rateTotal={rateTotal}
          paidFor={paidFor}
          crewTotal={crewTotal}
          crewPaid={crewPaid}
          crewDue={crewDue}
          mutate={mutate.mutate}
        />
      )}

      {tab === "entries" && (
        <EntriesTab
          projectId={projectId}
          entries={entries}
          days={days}
          currency={currency}
          mutate={mutate.mutate}
        />
      )}
    </div>
  );
}

/* --------------------------- Overview --------------------------- */

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl bg-white/5 p-3">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className={`mt-0.5 text-sm font-bold tabular-nums ${tone ?? ""}`}>{value}</div>
    </div>
  );
}

function OverviewTab(props: {
  projectId: string;
  project: Record<string, any>;
  currency: string;
  clientBudget: number;
  expense: number;
  income: number;
  incomeReceived: number;
  receivable: number;
  outOfPocket: number;
  crewDue: number;
  profit: number;
  onSave: (values: Record<string, unknown>) => void;
}) {
  const { projectId, project, currency } = props;
  const [form, setForm] = useState({
    client_budget: String(project["client_budget"] ?? 0),
    client_name: (project["client_name"] as string) ?? "",
    client_due_date: (project["client_due_date"] as string) ?? "",
  });

  return (
    <div className="space-y-4">
      <section className="glass-card rounded-2xl p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground">الربح المتوقع</div>
            <div className={`mt-1 text-2xl font-black tabular-nums ${props.profit >= 0 ? "text-amber" : "text-red-400"}`}>
              {money(props.profit, currency)}
            </div>
          </div>
          <Wallet size={30} className="text-amber" />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Stat label="ميزانية العميل" value={money(props.clientBudget, currency)} tone="text-emerald-400" />
          <Stat label="المصروف الفعلي" value={money(props.expense, currency)} tone="text-red-400" />
          <Stat label="مستحق من العميل" value={money(props.receivable, currency)} tone="text-amber" />
          <Stat label="مستحق للطاقم" value={money(props.crewDue, currency)} tone="text-amber" />
        </div>
        <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-center text-[11px]">
          <span className="text-muted-foreground">دفعتُه من جيبي الخاص: </span>
          <span className="font-bold tabular-nums text-amber">{money(props.outOfPocket, currency)}</span>
        </div>
        {project["client_due_date"] && (
          <div className="mt-2 text-center text-[11px] text-muted-foreground">
            دفعة العميل مستحقة بتاريخ {project["client_due_date"]}
          </div>
        )}
      </section>

      <section className="glass-card space-y-2.5 rounded-2xl p-4">
        <div className="text-sm font-bold">بيانات العميل والميزانية</div>
        <input
          value={form.client_name}
          onChange={(e) => setForm({ ...form, client_name: e.target.value })}
          placeholder="اسم العميل"
          className={input}
        />
        <div className="grid grid-cols-2 gap-2">
          <label className="text-[10px] text-muted-foreground">
            الميزانية الكلية
            <input
              value={form.client_budget}
              onChange={(e) => setForm({ ...form, client_budget: e.target.value })}
              inputMode="decimal"
              className={input}
            />
          </label>
          <label className="text-[10px] text-muted-foreground">
            تاريخ استحقاق الدفعة
            <input
              type="date"
              value={form.client_due_date}
              onChange={(e) => setForm({ ...form, client_due_date: e.target.value })}
              className={input}
            />
          </label>
        </div>
        <button
          onClick={() =>
            props.onSave({
              client_budget: Number(form.client_budget || 0),
              client_name: form.client_name.trim() || null,
              client_due_date: form.client_due_date || null,
            })
          }
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 py-2 text-xs font-bold"
        >
          <Save size={14} /> حفظ
        </button>
      </section>

      <Link
        to="/p/$projectId/quotations"
        params={{ projectId }}
        className="glass-card flex items-center justify-between rounded-2xl p-4 transition-transform active:scale-[0.98]"
      >
        <div className="flex items-center gap-3">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-amber-gradient text-black">
            <FileText size={20} />
          </div>
          <div>
            <div className="text-base font-bold">عروض الأسعار والعقود</div>
            <div className="text-[11px] text-muted-foreground">أنشئ عرض سعر أو عقد وشاركه مع العميل</div>
          </div>
        </div>
        <ChevronLeft className="text-muted-foreground" size={20} />
      </Link>
    </div>
  );
}

/* ----------------------------- Days ----------------------------- */

function DaysTab({
  days, currency, dayActual, onBudget,
}: {
  projectId: string;
  days: Array<Record<string, any>>;
  currency: string;
  dayActual: (id: string) => number;
  onBudget: (id: string, budget: number) => void;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [value, setValue] = useState("");

  if (days.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-xs text-muted-foreground">
        أضف أيام التصوير من قسم «الجداول» أولاً
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {days.map((d) => {
        const budget = Number(d["day_budget"] ?? 0);
        const actual = dayActual(d["id"] as string);
        const diff = budget - actual;
        return (
          <div key={d["id"]} className="glass-card rounded-2xl p-4">
            <div className="flex items-center gap-2">
              <CalendarDays size={16} className="text-amber" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold">{d["title"]}</div>
                <div className="text-[11px] text-muted-foreground">{d["shoot_date"] ?? "بدون تاريخ"}</div>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-white/5 p-2">
                <div className="text-[10px] text-muted-foreground">ميزانية اليوم</div>
                <div className="text-xs font-bold tabular-nums">{budget.toLocaleString("en-US")}</div>
              </div>
              <div className="rounded-xl bg-white/5 p-2">
                <div className="text-[10px] text-muted-foreground">المصروف</div>
                <div className="text-xs font-bold tabular-nums text-red-400">{actual.toLocaleString("en-US")}</div>
              </div>
              <div className="rounded-xl bg-white/5 p-2">
                <div className="text-[10px] text-muted-foreground">الفرق</div>
                <div className={`text-xs font-bold tabular-nums ${diff >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {diff.toLocaleString("en-US")}
                </div>
              </div>
            </div>
            {editing === d["id"] ? (
              <div className="mt-3 flex gap-2">
                <input
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  inputMode="decimal"
                  placeholder={`ميزانية اليوم (${currency})`}
                  className={input}
                />
                <button
                  onClick={() => {
                    onBudget(d["id"] as string, Number(value || 0));
                    setEditing(null);
                  }}
                  className="shrink-0 rounded-xl bg-amber-gradient px-4 text-xs font-bold text-black"
                >
                  حفظ
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setEditing(d["id"] as string);
                  setValue(String(budget || ""));
                }}
                className="mt-3 w-full rounded-xl border border-white/10 bg-white/5 py-2 text-[11px] font-bold text-muted-foreground"
              >
                تعديل ميزانية اليوم
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ----------------------------- Crew ----------------------------- */

function CrewTab({
  projectId, rates, members, currency, rateTotal, paidFor, crewTotal, crewPaid, crewDue, mutate,
}: {
  projectId: string;
  rates: Array<Record<string, any>>;
  members: Array<Record<string, any>>;
  currency: string;
  rateTotal: (r: Record<string, any>) => number;
  paidFor: (id: string) => number;
  crewTotal: number;
  crewPaid: number;
  crewDue: number;
  mutate: (v: Parameters<typeof financeWrite>[0]["data"]) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [payFor, setPayFor] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [form, setForm] = useState({
    person_name: "", role: "", rate_type: "day", rate: "", days: "1", team_member_id: "",
  });

  return (
    <div className="space-y-3">
      <section className="glass-card grid grid-cols-3 gap-2 rounded-2xl p-4 text-center">
        <div>
          <div className="text-[10px] text-muted-foreground">إجمالي الطاقم</div>
          <div className="text-sm font-bold tabular-nums">{crewTotal.toLocaleString("en-US")}</div>
        </div>
        <div>
          <div className="text-[10px] text-muted-foreground">المدفوع</div>
          <div className="text-sm font-bold tabular-nums text-emerald-400">{crewPaid.toLocaleString("en-US")}</div>
        </div>
        <div>
          <div className="text-[10px] text-muted-foreground">المتبقي</div>
          <div className="text-sm font-bold tabular-nums text-amber">{crewDue.toLocaleString("en-US")}</div>
        </div>
      </section>

      {showForm ? (
        <div className="glass-card space-y-2.5 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-bold">إضافة شخص وسعره</div>
            <button onClick={() => setShowForm(false)} className="text-muted-foreground"><X size={16} /></button>
          </div>
          <select
            value={form.team_member_id}
            onChange={(e) => {
              const m = members.find((x) => x["id"] === e.target.value);
              setForm({
                ...form,
                team_member_id: e.target.value,
                person_name: (m?.["name"] as string) ?? form.person_name,
                role: (m?.["role"] as string) ?? form.role,
              });
            }}
            className={input}
          >
            <option value="" className="bg-background">اختر من الفريق (اختياري)</option>
            {members.map((m) => (
              <option key={m["id"]} value={m["id"]} className="bg-background">{m["name"]}</option>
            ))}
          </select>
          <input value={form.person_name} onChange={(e) => setForm({ ...form, person_name: e.target.value })} placeholder="الاسم" className={input} />
          <input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="الدور (مصوّر، صوت...)" className={input} />
          <div className="grid grid-cols-2 gap-2">
            {(["day", "flat"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setForm({ ...form, rate_type: t })}
                className={`rounded-xl py-2 text-xs font-bold transition ${
                  form.rate_type === t ? "bg-amber-gradient text-black" : "border border-white/10 bg-white/5"
                }`}
              >
                {t === "day" ? "سعر يومي" : "سعر مقطوع"}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} inputMode="decimal" placeholder="السعر" className={input} />
            <input
              value={form.days}
              onChange={(e) => setForm({ ...form, days: e.target.value })}
              inputMode="decimal"
              placeholder="عدد الأيام"
              disabled={form.rate_type === "flat"}
              className={`${input} disabled:opacity-40`}
            />
          </div>
          <button
            onClick={() => {
              if (!form.person_name.trim()) return toast.error("اكتب الاسم");
              mutate({
                projectId, table: "crew_rates", action: "insert",
                values: {
                  person_name: form.person_name.trim(),
                  role: form.role.trim() || null,
                  rate_type: form.rate_type,
                  rate: Number(form.rate || 0),
                  days: Number(form.days || 1),
                  team_member_id: form.team_member_id || null,
                  currency,
                },
              });
              setForm({ person_name: "", role: "", rate_type: "day", rate: "", days: "1", team_member_id: "" });
              setShowForm(false);
            }}
            className="w-full rounded-xl bg-amber-gradient py-2.5 text-sm font-bold text-black"
          >
            حفظ
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-amber-500/40 py-3 text-sm font-bold text-amber"
        >
          <Plus size={16} /> إضافة شخص وسعره
        </button>
      )}

      {rates.length === 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-xs text-muted-foreground">
          لم تُضف أسعار الطاقم بعد
        </div>
      )}

      {rates.map((r) => {
        const total = rateTotal(r);
        const paid = paidFor(r["id"] as string);
        const due = total - paid;
        return (
          <div key={r["id"]} className="glass-card rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber">
                <Users size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold">{r["person_name"]}</div>
                <div className="truncate text-[11px] text-muted-foreground">
                  {r["role"] || "طاقم"} · {r["rate_type"] === "flat" ? "مقطوع" : `${Number(r["rate"])} × ${Number(r["days"])} يوم`}
                </div>
              </div>
              <button
                onClick={() => mutate({ projectId, table: "crew_rates", action: "delete", id: r["id"] as string })}
                className="shrink-0 text-muted-foreground hover:text-red-400"
                aria-label="حذف"
              >
                <Trash2 size={16} />
              </button>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-white/5 p-2">
                <div className="text-[10px] text-muted-foreground">الإجمالي</div>
                <div className="text-xs font-bold tabular-nums">{total.toLocaleString("en-US")}</div>
              </div>
              <div className="rounded-xl bg-white/5 p-2">
                <div className="text-[10px] text-muted-foreground">المدفوع</div>
                <div className="text-xs font-bold tabular-nums text-emerald-400">{paid.toLocaleString("en-US")}</div>
              </div>
              <div className="rounded-xl bg-white/5 p-2">
                <div className="text-[10px] text-muted-foreground">المتبقي</div>
                <div className={`text-xs font-bold tabular-nums ${due > 0 ? "text-amber" : "text-emerald-400"}`}>
                  {due.toLocaleString("en-US")}
                </div>
              </div>
            </div>
            {payFor === r["id"] ? (
              <div className="mt-3 flex gap-2">
                <input
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  inputMode="decimal"
                  placeholder={`المبلغ المدفوع (${currency})`}
                  className={input}
                />
                <button
                  onClick={() => {
                    mutate({
                      projectId, table: "crew_payments", action: "insert",
                      values: { crew_rate_id: r["id"], amount: Number(payAmount || 0) },
                    });
                    setPayAmount("");
                    setPayFor(null);
                  }}
                  className="shrink-0 rounded-xl bg-amber-gradient px-4 text-xs font-bold text-black"
                >
                  حفظ
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setPayFor(r["id"] as string); setPayAmount(String(due > 0 ? due : "")); }}
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 py-2 text-[11px] font-bold text-muted-foreground"
              >
                <HandCoins size={13} /> تسجيل دفعة
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ---------------------------- Entries --------------------------- */

function EntriesTab({
  projectId, entries, days, currency, mutate,
}: {
  projectId: string;
  entries: Array<Record<string, any>>;
  days: Array<Record<string, any>>;
  currency: string;
  mutate: (v: Parameters<typeof financeWrite>[0]["data"]) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<"all" | "income" | "expense" | "unpaid">("all");
  const [form, setForm] = useState({
    entry_type: "expense",
    title: "",
    category: "أخرى",
    amount: "",
    party: "",
    entry_date: new Date().toISOString().slice(0, 10),
    call_sheet_id: "",
    paid_by: "project",
    is_paid: false,
  });

  const visible = entries.filter((e) =>
    filter === "all" ? true : filter === "unpaid" ? !e["is_paid"] : e["entry_type"] === filter,
  );

  return (
    <div className="space-y-3">
      <div className="flex gap-2 overflow-x-auto">
        {([
          ["all", "الكل"], ["expense", "مصاريف"], ["income", "إيرادات"], ["unpaid", "غير مسدّد"],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-bold transition ${
              filter === key ? "bg-amber-gradient text-black" : "border border-white/10 bg-white/5 text-muted-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {showForm ? (
        <div className="glass-card space-y-2.5 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-bold">حركة مالية جديدة</div>
            <button onClick={() => setShowForm(false)} className="text-muted-foreground"><X size={16} /></button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(["expense", "income"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setForm({ ...form, entry_type: t })}
                className={`rounded-xl py-2 text-xs font-bold transition ${
                  form.entry_type === t ? "bg-amber-gradient text-black" : "border border-white/10 bg-white/5"
                }`}
              >
                {t === "expense" ? "مصروف" : "إيراد"}
              </button>
            ))}
          </div>
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="البند (مثال: إيجار كاميرا)" className={input} />
          <div className="grid grid-cols-2 gap-2">
            <input value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} inputMode="decimal" placeholder="المبلغ" className={input} />
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={input}>
              {CATEGORIES.map((c) => <option key={c} value={c} className="bg-background">{c}</option>)}
            </select>
          </div>
          <select value={form.call_sheet_id} onChange={(e) => setForm({ ...form, call_sheet_id: e.target.value })} className={input}>
            <option value="" className="bg-background">غير مرتبط بيوم تصوير</option>
            {days.map((d) => (
              <option key={d["id"]} value={d["id"]} className="bg-background">
                {d["title"]}{d["shoot_date"] ? ` — ${d["shoot_date"]}` : ""}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-3 gap-2">
            {PAID_BY.map(([key, label]) => (
              <button
                key={key}
                onClick={() => setForm({ ...form, paid_by: key })}
                className={`rounded-xl py-2 text-[11px] font-bold transition ${
                  form.paid_by === key ? "bg-amber-gradient text-black" : "border border-white/10 bg-white/5"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input value={form.party} onChange={(e) => setForm({ ...form, party: e.target.value })} placeholder="الجهة / المورّد" className={input} />
            <input type="date" value={form.entry_date} onChange={(e) => setForm({ ...form, entry_date: e.target.value })} className={input} />
          </div>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input type="checkbox" checked={form.is_paid} onChange={(e) => setForm({ ...form, is_paid: e.target.checked })} className="accent-amber-500" />
            تم الدفع / التحصيل
          </label>
          <button
            onClick={() => {
              if (!form.title.trim()) return toast.error("اكتب اسم البند");
              mutate({
                projectId, table: "finance_entries", action: "insert",
                values: {
                  entry_type: form.entry_type,
                  title: form.title.trim(),
                  category: form.category,
                  amount: Number(form.amount || 0),
                  party: form.party.trim() || null,
                  entry_date: form.entry_date || null,
                  call_sheet_id: form.call_sheet_id || null,
                  paid_by: form.paid_by,
                  is_paid: form.is_paid,
                  currency,
                },
              });
              setForm({ ...form, title: "", amount: "", party: "" });
              setShowForm(false);
            }}
            className="w-full rounded-xl bg-amber-gradient py-2.5 text-sm font-bold text-black"
          >
            حفظ
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-amber-500/40 py-3 text-sm font-bold text-amber"
        >
          <Plus size={16} /> إضافة حركة مالية
        </button>
      )}

      <div className="space-y-2">
        {visible.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-xs text-muted-foreground">
            لا توجد حركات مالية بعد
          </div>
        )}
        {visible.map((e) => {
          const day = days.find((d) => d["id"] === e["call_sheet_id"]);
          const payer = PAID_BY.find(([k]) => k === e["paid_by"])?.[1];
          return (
            <div key={e["id"]} className="glass-card flex items-center gap-3 rounded-2xl p-3.5">
              <button
                onClick={() =>
                  mutate({
                    projectId, table: "finance_entries", action: "update",
                    id: e["id"] as string, values: { is_paid: !e["is_paid"] },
                  })
                }
                className={e["is_paid"] ? "text-emerald-400" : "text-muted-foreground"}
                aria-label="تبديل حالة الدفع"
              >
                {e["is_paid"] ? <CheckCircle2 size={22} /> : <Circle size={22} />}
              </button>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold">{e["title"]}</div>
                <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                  {e["category"]}
                  {day ? ` · ${day["title"]}` : ""}
                  {payer ? ` · ${payer}` : ""}
                  {e["entry_date"] ? ` · ${e["entry_date"]}` : ""}
                </div>
              </div>
              <div className={`shrink-0 text-sm font-black tabular-nums ${e["entry_type"] === "income" ? "text-emerald-400" : "text-red-400"}`}>
                {e["entry_type"] === "income" ? "+" : "−"}{Number(e["amount"]).toLocaleString("en-US")}
              </div>
              <button
                onClick={() => mutate({ projectId, table: "finance_entries", action: "delete", id: e["id"] as string })}
                className="shrink-0 text-muted-foreground hover:text-red-400"
                aria-label="حذف"
              >
                <Trash2 size={16} />
              </button>
            </div>
          );
        })}
      </div>

      <div className="pt-1 text-center text-[11px] text-muted-foreground">
        العملة: {money(0, currency).split(" ")[1]}
      </div>
      <div className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
        <TrendingUp size={12} className="text-emerald-400" />
        <TrendingDown size={12} className="text-red-400" />
      </div>
    </div>
  );
}
