import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { FinanceGate, useFinanceLock } from "@/components/FinanceGate";
import { financeOverviewQuery } from "@/lib/finance-queries";
import { financeWrite } from "@/lib/finance.functions";
import { Plus, Wallet, TrendingUp, TrendingDown, Trash2, CheckCircle2, Circle, ChevronLeft, FileText, X, Lock, CalendarDays, Users, HandCoins, Save, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
  const { data, isLoading, error } = useQuery({ ...financeOverviewQuery(projectId, true), retry: 1 });
  const write = useServerFn(financeWrite);
  const lock = useFinanceLock(projectId);

  const refresh = () => qc.invalidateQueries({ queryKey: ["finance-overview", projectId] });

  const mutate = useMutation({
    mutationFn: (vars: Parameters<typeof financeWrite>[0]["data"]) => write({ data: vars }),
    onSuccess: () => refresh(),
    onError: () => toast.error("تعذر الحفظ"),
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-center px-6">
        <p className="text-sm text-red-400">تعذر تحميل البيانات المالية</p>
        <p className="text-xs text-muted-foreground">{String(error)}</p>
        <button onClick={refresh} className="rounded-xl bg-amber-gradient px-4 py-2 text-xs font-bold text-black">
          إعادة المحاولة
        </button>
      </div>
    );
  }

  const entries = data.entries as Array<Record<string, any>>;
  const days = data.days as Array<Record<string, any>>;
  const rates = data.rates as Array<Record<string, any>>;
  const payments = data.payments as Array<Record<string, any>>;
  const project = (data.project ?? {}) as Record<string, any>;
  const currency = (entries[0]?.["currency"] as string) ?? "JOD";

  const num = (v: unknown) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const incomeEntries = entries.filter((e) => e["entry_type"] === "income");
  const expenseEntries = entries.filter((e) => e["entry_type"] === "expense");

  const income = incomeEntries.reduce((s, e) => s + num(e["amount"]), 0);
  const incomeReceived = incomeEntries.filter((e) => e["is_paid"]).reduce((s, e) => s + num(e["amount"]), 0);
  const expense = expenseEntries.reduce((s, e) => s + num(e["amount"]), 0);

  // «من جيبي» = مصاريف دفعها المنتج شخصياً + دفعات الطاقم التي دفعها من جيبه
  const outOfPocket =
    expenseEntries.filter((e) => e["paid_by"] === "producer").reduce((s, e) => s + num(e["amount"]), 0) +
    payments.filter((p) => p["paid_by"] === "producer").reduce((s, p) => s + num(p["amount"]), 0);

  // ذمم لأشخاص آخرين دفعوا من جيبهم ولم تُسدَّد لهم بعد
  const KNOWN_PAYERS = ["producer", "project", "client"];
  const ious = expenseEntries
    .filter((e) => e["paid_by"] && !KNOWN_PAYERS.includes(e["paid_by"]) && !e["is_paid"])
    .reduce((acc, e) => {
      const p = String(e["paid_by"]);
      acc[p] = (acc[p] || 0) + num(e["amount"]);
      return acc;
    }, {} as Record<string, number>);

  const clientBudget = num(project["client_budget"]);

  const rateTotal = (r: Record<string, any>) =>
    r["rate_type"] === "flat" ? num(r["rate"]) : num(r["rate"]) * num(r["days"] || 0);
  const paidFor = (rateId: string) =>
    payments.filter((p) => p["crew_rate_id"] === rateId).reduce((s, p) => s + num(p["amount"]), 0);
  const crewTotal = rates.reduce((s, r) => s + rateTotal(r), 0);
  const crewPaid = rates.reduce((s, r) => s + paidFor(r["id"] as string), 0);
  const crewDue = crewTotal - crewPaid;
  const receivable = Math.max(clientBudget - incomeReceived, 0);

  // التكلفة الكلية = مصاريف مسجّلة + التزامات الطاقم (المدفوع والمتبقي)
  // أجور الطاقم تُسجَّل في «الطاقم والأسعار» فقط، فلا يوجد ازدواج مع الحركات.
  const totalCost = expense + crewTotal;
  const profit = clientBudget - totalCost;

  const dayActual = (dayId: string) =>
    entries
      .filter((e) => e["call_sheet_id"] === dayId && e["entry_type"] === "expense")
      .reduce((s, e) => s + num(e["amount"]), 0);
  const dayBudgetSum = days.reduce((s, d) => s + num(d["day_budget"]), 0);

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
          ious={ious}
          crewTotal={crewTotal}
          crewDue={crewDue}
          totalCost={totalCost}
          profit={profit}
          saving={mutate.isPending}
          onSave={(values) => mutate.mutate({ projectId, table: "projects", action: "update", id: projectId, values })}
        />
      )}

      {tab === "days" && (
        <DaysTab
          projectId={projectId}
          days={days}
          currency={currency}
          clientBudget={clientBudget}
          dayBudgetSum={dayBudgetSum}
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

/* --------------------------- UI Helpers --------------------------- */

function AnimatedNumber({ value, currency, className }: { value: number; currency: string; className?: string }) {
  const [display, setDisplay] = useState(value);
  const prevValue = useRef(value);
  
  useEffect(() => {
    if (prevValue.current === value) return;
    
    let start = prevValue.current;
    const end = value;
    const duration = 800; // ms
    const startTime = performance.now();
    
    const animate = (currTime: number) => {
      const elapsed = currTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // easeOutExpo
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      
      setDisplay(start + (end - start) * ease);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setDisplay(end);
        prevValue.current = end;
      }
    };
    requestAnimationFrame(animate);
  }, [value]);
  
  return <span className={className}>{money(display, currency)}</span>;
}

function HintTooltip({ text, iconClass }: { text: string, iconClass?: string }) {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <Info size={12} className={`inline-block mr-1 text-muted-foreground/60 hover:text-amber transition-colors cursor-help ${iconClass ?? ''}`} />
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[200px] text-center bg-zinc-900 border border-white/10 text-white shadow-xl shadow-black/50 z-50">
          <p>{text}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function Stat({ label, value, tone, isAnimated = false, currency, hint }: { label: string; value: string | number; tone?: string, isAnimated?: boolean, currency?: string, hint?: string }) {
  return (
    <div className="rounded-xl bg-white/5 p-3">
      <div className="text-[11px] text-muted-foreground flex items-center">
        {label}
        {hint && <HintTooltip text={hint} />}
      </div>
      <div className={`mt-0.5 text-sm font-bold tabular-nums ${tone ?? ""}`}>
        {isAnimated && typeof value === 'number' && currency ? (
          <AnimatedNumber value={value} currency={currency} />
        ) : (
          value
        )}
      </div>
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
  ious: Record<string, number>;
  crewTotal: number;
  crewDue: number;
  totalCost: number;
  profit: number;
  saving: boolean;
  onSave: (values: Record<string, unknown>) => void;
}) {
  const { projectId, project, currency } = props;
  const [form, setForm] = useState({
    client_budget: String(project["client_budget"] ?? 0),
    client_name: (project["client_name"] as string) ?? "",
    client_due_date: (project["client_due_date"] as string) ?? "",
  });

  // إبقاء النموذج متزامناً مع البيانات القادمة من الخادم
  useEffect(() => {
    setForm({
      client_budget: String(project["client_budget"] ?? 0),
      client_name: (project["client_name"] as string) ?? "",
      client_due_date: (project["client_due_date"] as string) ?? "",
    });
  }, [project["client_budget"], project["client_name"], project["client_due_date"]]);

  // 1. Color-Shifting Aura
  const costRatio = props.clientBudget > 0 ? props.totalCost / props.clientBudget : 0;
  let auraColor = "from-emerald-500/10 via-transparent to-transparent";
  if (costRatio > 0.9) auraColor = "from-red-500/20 via-transparent to-transparent";
  else if (costRatio > 0.7) auraColor = "from-amber-500/20 via-transparent to-transparent";

  const [isSaved, setIsSaved] = useState(false);
  const handleSave = () => {
    const budget = Number(String(form.client_budget).replace(/,/g, ""));
    if (!Number.isFinite(budget) || budget < 0) {
      toast.error("أدخل ميزانية صحيحة");
      return;
    }
    props.onSave({
      client_budget: budget,
      client_name: form.client_name.trim() || null,
      client_due_date: form.client_due_date || null,
    });
    setIsSaved(true);
    if (navigator.vibrate) navigator.vibrate([10, 30, 10]);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const daysToDue = (() => {
    const d = project["client_due_date"] as string | null;
    if (!d) return null;
    const diff = Math.ceil((new Date(`${d}T00:00:00`).getTime() - Date.now()) / 86400000);
    return Number.isFinite(diff) ? diff : null;
  })();

  return (
    <div className="space-y-4">
      <section className="glass-card relative overflow-hidden rounded-2xl p-5">
        <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br transition-colors duration-1000 ${auraColor}`} />
        
        <div className="relative flex items-center justify-between z-10">
          <div>
            <div className="text-xs text-muted-foreground flex items-center">
              الربح المتوقع
              <HintTooltip text="ميزانية العميل ناقص التكلفة الكلية (المصاريف المسجّلة + أجور الطاقم كاملة)" />
            </div>
            <div className={`mt-1 text-2xl font-black tabular-nums ${props.profit >= 0 ? "text-amber" : "text-red-400"}`}>
              <AnimatedNumber value={props.profit} currency={currency} />
            </div>
          </div>
          <Wallet size={30} className="text-amber" />
        </div>

        {props.clientBudget > 0 && (
          <div className="relative z-10 mt-3">
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  costRatio > 1 ? "bg-red-500" : costRatio > 0.8 ? "bg-amber-500" : "bg-emerald-500"
                }`}
                style={{ width: `${Math.min(costRatio * 100, 100)}%` }}
              />
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
              <span>استُهلك {Math.round(costRatio * 100)}% من الميزانية</span>
              <span className="tabular-nums">{money(props.totalCost, currency)}</span>
            </div>
          </div>
        )}

        <div className="relative z-10 mt-4 grid grid-cols-2 gap-3">
          <Stat label="ميزانية العميل" value={props.clientBudget} currency={currency} isAnimated tone="text-emerald-400" hint="إجمالي ما تم الاتفاق عليه مع العميل" />
          <Stat label="التكلفة الكلية" value={props.totalCost} currency={currency} isAnimated tone="text-red-400" hint="المصاريف المسجّلة + أجور الطاقم كاملة (المدفوع والمتبقي)" />
          <Stat label="المصاريف المسجّلة" value={props.expense} currency={currency} isAnimated tone="text-red-400" hint="مجموع الحركات من نوع مصروف (بدون أجور الطاقم)" />
          <Stat label="أجور الطاقم" value={props.crewTotal} currency={currency} isAnimated tone="text-red-400" hint="مجموع أسعار الطاقم المتفق عليها" />
          <Stat label="محصّل فعلياً" value={props.incomeReceived} currency={currency} isAnimated tone="text-emerald-400" hint="الإيرادات التي دخلت فعلاً (مؤشّرة كمقبوضة)" />
          <Stat label="مستحق من العميل" value={props.receivable} currency={currency} isAnimated tone="text-amber" hint="ميزانية العميل ناقص ما حصّلته فعلاً" />
          <Stat label="مستحق للطاقم" value={props.crewDue} currency={currency} isAnimated tone="text-amber" hint="الأجور المتبقية التي يجب دفعها لفريق العمل" />
          <Stat label="إجمالي الإيرادات" value={props.income} currency={currency} isAnimated hint="كل الإيرادات المسجّلة سواء حُصّلت أم لا" />
        </div>
        <div className="relative z-10 mt-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-center text-[11px]">
          <span className="text-muted-foreground flex items-center justify-center gap-1">
            دفعتُه من جيبي الخاص:
            <HintTooltip text="مبالغ دفعها المنتج من حسابه الشخصي ويجب استردادها لاحقاً" />
          </span>
          <span className="font-bold tabular-nums text-amber">
             <AnimatedNumber value={props.outOfPocket} currency={currency} />
          </span>
        </div>
        {Object.keys(props.ious).length > 0 && (
          <div className="relative z-10 mt-3 rounded-xl border border-blue-500/20 bg-blue-500/5 p-3 text-center text-[11px]">
            <div className="text-muted-foreground flex items-center justify-center gap-1 mb-2">
              تسويات وذمم مالية
              <HintTooltip text="مصاريف دفعها أشخاص من جيبهم ويجب على المشروع سدادها لهم" />
            </div>
            {Object.entries(props.ious).map(([person, amount]) => (
              <div key={person} className="flex justify-between items-center border-t border-white/5 pt-1.5 mt-1.5">
                <span className="text-muted-foreground">لصالح: <span className="font-bold text-white ml-1">{person}</span></span>
                <span className="font-bold tabular-nums text-blue-400">
                  <AnimatedNumber value={amount} currency={currency} />
                </span>
              </div>
            ))}
          </div>
        )}
        {project["client_due_date"] && (
          <div className="relative z-10 mt-2 text-center text-[11px] text-muted-foreground">
            دفعة العميل مستحقة بتاريخ {project["client_due_date"]}
            {daysToDue !== null && (
              <span className={daysToDue < 0 ? "text-red-400 font-bold" : "text-amber font-bold"}>
                {daysToDue < 0 ? ` — متأخرة ${Math.abs(daysToDue)} يوم` : daysToDue === 0 ? " — اليوم" : ` — بعد ${daysToDue} يوم`}
              </span>
            )}
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
          onClick={handleSave}
          className="relative overflow-hidden flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 py-2 text-xs font-bold active:scale-95 transition-transform"
        >
          <span className={`flex items-center gap-2 transition-opacity duration-300 ${isSaved ? 'opacity-0' : 'opacity-100'}`}>
            <Save size={14} /> حفظ
          </span>
          
          {isSaved && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-in zoom-in spin-in-12 text-emerald-400 font-black text-sm rotate-[-10deg] border border-emerald-400 rounded px-2">تم الحفظ</div>
            </div>
          )}
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

function SwipeToPay({ onSwipe, disabled }: { onSwipe: () => void, disabled: boolean }) {
  const [val, setVal] = useState(0);
  const handleEnd = () => {
     if (disabled) return;
     if (val > 80) {
        setVal(100);
        if (navigator.vibrate) navigator.vibrate([20, 50, 20]);
        setTimeout(() => {
          onSwipe();
          setVal(0);
        }, 300);
     } else {
        setVal(0);
     }
  };
  
  if (disabled) return null;

  return (
    <div className="relative h-10 rounded-xl bg-white/5 overflow-hidden flex items-center justify-center mt-2 group border border-white/5">
       <div className="absolute inset-y-0 right-0 bg-emerald-500/20 transition-all duration-75" style={{ width: `${val}%` }} />
       <input type="range" min="0" max="100" value={val} 
          onChange={e => setVal(Number(e.target.value))} 
          onMouseUp={handleEnd} onTouchEnd={handleEnd}
          className="absolute inset-0 opacity-0 w-full cursor-grab z-10 dir-ltr" dir="ltr" />
       <div className="absolute right-0 top-0 bottom-0 pointer-events-none transition-all duration-75 flex items-center justify-center w-12 bg-emerald-500/80 rounded-xl" style={{ transform: `translateX(-${val * 2.5}px)` }}>
          <HandCoins size={14} className="text-white" />
       </div>
       <div className="text-[11px] font-bold text-muted-foreground pointer-events-none pr-6">اسحب لدفع المتبقي</div>
    </div>
  );
}

function CrewTab({
  projectId, rates, members, currency, rateTotal, paidFor, crewTotal, crewPaid, crewDue, mutate,
}: {
  projectId: string;
  rates: Array<Record<string, any>>;
  members: Array<Record<string, any>>;
  currency: string;
  rateTotal: (r: any) => number;
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
          <div className="text-sm font-bold tabular-nums">
             <AnimatedNumber value={crewTotal} currency={currency} />
          </div>
        </div>
        <div>
          <div className="text-[10px] text-muted-foreground">المدفوع</div>
          <div className="text-sm font-bold tabular-nums text-emerald-400">
             <AnimatedNumber value={crewPaid} currency={currency} />
          </div>
        </div>
        <div>
          <div className="text-[10px] text-muted-foreground">المتبقي</div>
          <div className="text-sm font-bold tabular-nums text-amber">
             <AnimatedNumber value={crewDue} currency={currency} />
          </div>
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
          <div key={r["id"]} className="glass-card rounded-2xl p-4 transition-all duration-500 hover:scale-[1.01]">
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
                <div className="text-xs font-bold tabular-nums">
                   <AnimatedNumber value={total} currency={currency} />
                </div>
              </div>
              <div className="rounded-xl bg-white/5 p-2">
                <div className="text-[10px] text-muted-foreground">المدفوع</div>
                <div className="text-xs font-bold tabular-nums text-emerald-400">
                   <AnimatedNumber value={paid} currency={currency} />
                </div>
              </div>
              <div className="rounded-xl bg-white/5 p-2">
                <div className="text-[10px] text-muted-foreground">المتبقي</div>
                <div className={`text-xs font-bold tabular-nums ${due > 0 ? "text-amber" : "text-emerald-400"}`}>
                  <AnimatedNumber value={due} currency={currency} />
                </div>
              </div>
            </div>
            {payFor === r["id"] ? (
              <div className="mt-3">
                <div className="flex gap-2">
                  <input
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    inputMode="decimal"
                    placeholder={`المبلغ (${currency})`}
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
                <SwipeToPay disabled={due <= 0} onSwipe={() => {
                  mutate({
                    projectId, table: "crew_payments", action: "insert",
                    values: { crew_rate_id: r["id"], amount: due },
                  });
                  setPayFor(null);
                }} />
              </div>
            ) : (
              <button
                onClick={() => { setPayFor(r["id"] as string); setPayAmount(String(due > 0 ? due : "")); }}
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 py-2 text-[11px] font-bold text-muted-foreground transition hover:bg-white/10"
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
          <div className="grid grid-cols-4 gap-2">
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
            <button
                onClick={() => setForm({ ...form, paid_by: "custom" })}
                className={`rounded-xl py-2 text-[11px] font-bold transition ${
                  !PAID_BY.some(([k]) => k === form.paid_by) ? "bg-amber-gradient text-black" : "border border-white/10 bg-white/5"
                }`}
              >
                شخص آخر
            </button>
          </div>
          {!PAID_BY.some(([k]) => k === form.paid_by) && (
            <input 
              value={form.paid_by === 'custom' ? '' : form.paid_by} 
              onChange={e => setForm({ ...form, paid_by: e.target.value })} 
              placeholder="اكتب اسم الشخص الذي دفع..." 
              className={input} 
            />
          )}
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
                  paid_by: form.paid_by === 'custom' ? 'شخص آخر' : form.paid_by.trim(),
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
          const payerDefault = PAID_BY.find(([k]) => k === e["paid_by"])?.[1];
          const payer = payerDefault || (e["paid_by"] ? `دفعها: ${e["paid_by"]}` : null);
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
