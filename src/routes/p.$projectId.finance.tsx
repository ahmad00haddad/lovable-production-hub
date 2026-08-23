import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { financeQuery, projectQuery } from "@/lib/queries";
import { toast } from "sonner";
import {
  Plus, Wallet, TrendingUp, TrendingDown, Trash2, CheckCircle2,
  Circle, ChevronLeft, FileText, X,
} from "lucide-react";

export const Route = createFileRoute("/p/$projectId/finance")({
  head: () => ({
    meta: [
      { title: "إدارة الأموال والفواتير — منصة الإنتاج" },
      { name: "description", content: "تتبّع ميزانية الإنتاج: الإيرادات والمصاريف والفواتير المدفوعة والمستحقة في مكان واحد." },
      { property: "og:title", content: "إدارة الأموال والفواتير" },
      { property: "og:description", content: "تتبّع ميزانية الإنتاج: الإيرادات والمصاريف والفواتير المدفوعة والمستحقة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context, params }) => {
    context.queryClient.ensureQueryData(projectQuery(params.projectId));
    context.queryClient.ensureQueryData(financeQuery(params.projectId));
  },
  pendingComponent: () => (
    <div className="flex h-64 items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
    </div>
  ),
  component: FinancePage,
});

const CATEGORIES = ["معدات", "طاقم", "مواصلات", "طعام", "مواقع", "ما بعد الإنتاج", "تسويق", "أخرى"];

function money(n: number, currency: string) {
  return `${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

function FinancePage() {
  const { projectId } = Route.useParams();
  const qc = useQueryClient();
  const { data: entries } = useSuspenseQuery(financeQuery(projectId));
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<"all" | "income" | "expense" | "unpaid">("all");

  const [form, setForm] = useState({
    entry_type: "expense",
    title: "",
    category: "أخرى",
    amount: "",
    party: "",
    entry_date: new Date().toISOString().slice(0, 10),
    is_paid: false,
    notes: "",
  });

  const currency = entries[0]?.currency ?? "JOD";
  const income = entries.filter((e) => e.entry_type === "income").reduce((s, e) => s + Number(e.amount), 0);
  const expense = entries.filter((e) => e.entry_type === "expense").reduce((s, e) => s + Number(e.amount), 0);
  const unpaid = entries.filter((e) => !e.is_paid).reduce((s, e) => s + Number(e.amount) * (e.entry_type === "income" ? 1 : -1), 0);

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("finance_entries").insert({
        project_id: projectId,
        entry_type: form.entry_type,
        title: form.title.trim(),
        category: form.category,
        amount: Number(form.amount || 0),
        party: form.party.trim() || null,
        entry_date: form.entry_date || null,
        is_paid: form.is_paid,
        notes: form.notes.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finance_entries", projectId] });
      setForm({ ...form, title: "", amount: "", party: "", notes: "" });
      setShowForm(false);
      toast.success("تمت إضافة الحركة المالية");
    },
    onError: () => toast.error("تعذر الحفظ"),
  });

  const togglePaid = useMutation({
    mutationFn: async ({ id, is_paid }: { id: string; is_paid: boolean }) => {
      const { error } = await supabase.from("finance_entries").update({ is_paid }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["finance_entries", projectId] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("finance_entries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finance_entries", projectId] });
      toast.success("تم الحذف");
    },
  });

  const visible = entries.filter((e) =>
    filter === "all" ? true : filter === "unpaid" ? !e.is_paid : e.entry_type === filter
  );

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pb-28 pt-8">
      <header className="mb-6">
        <h1 className="text-2xl font-black">إدارة الأموال والفواتير</h1>
        <p className="mt-1 text-xs text-muted-foreground">سجّل الإيرادات والمصاريف وتابع المستحقات.</p>
      </header>

      <section className="glass-card mb-4 rounded-2xl p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground">الرصيد الصافي</div>
            <div className={`mt-1 text-2xl font-black tabular-nums ${income - expense >= 0 ? "text-amber" : "text-red-400"}`}>
              {money(income - expense, currency)}
            </div>
          </div>
          <Wallet size={30} className="text-amber" />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 text-center">
          <div className="rounded-xl bg-white/5 p-3">
            <div className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
              <TrendingUp size={12} /> الإيرادات
            </div>
            <div className="mt-0.5 text-sm font-bold tabular-nums text-emerald-400">{money(income, currency)}</div>
          </div>
          <div className="rounded-xl bg-white/5 p-3">
            <div className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
              <TrendingDown size={12} /> المصاريف
            </div>
            <div className="mt-0.5 text-sm font-bold tabular-nums text-red-400">{money(expense, currency)}</div>
          </div>
        </div>
        <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-center text-[11px]">
          <span className="text-muted-foreground">غير مسدّد: </span>
          <span className="font-bold tabular-nums text-amber">{money(Math.abs(unpaid), currency)}</span>
        </div>
      </section>

      <Link
        to="/p/$projectId/quotations"
        params={{ projectId }}
        className="glass-card mb-5 flex items-center justify-between rounded-2xl p-4 transition-transform active:scale-[0.98]"
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

      <div className="mb-4 flex gap-2 overflow-x-auto">
        {([
          ["all", "الكل"],
          ["expense", "مصاريف"],
          ["income", "إيرادات"],
          ["unpaid", "غير مسدّد"],
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
        <div className="glass-card mb-5 space-y-3 rounded-2xl p-4">
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
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="البند (مثال: إيجار كاميرا)"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-amber-500/50"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              inputMode="decimal"
              placeholder="المبلغ"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm tabular-nums outline-none focus:border-amber-500/50"
            />
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-amber-500/50"
            >
              {CATEGORIES.map((c) => <option key={c} value={c} className="bg-background">{c}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              value={form.party}
              onChange={(e) => setForm({ ...form, party: e.target.value })}
              placeholder="الجهة / المورّد"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-amber-500/50"
            />
            <input
              type="date"
              value={form.entry_date}
              onChange={(e) => setForm({ ...form, entry_date: e.target.value })}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-amber-500/50"
            />
          </div>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={form.is_paid}
              onChange={(e) => setForm({ ...form, is_paid: e.target.checked })}
              className="accent-amber-500"
            />
            تم الدفع / التحصيل
          </label>
          <button
            onClick={() => form.title.trim() && create.mutate()}
            disabled={create.isPending || !form.title.trim()}
            className="w-full rounded-xl bg-amber-gradient py-2.5 text-sm font-bold text-black disabled:opacity-50"
          >
            حفظ
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="mb-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-amber-500/40 py-3 text-sm font-bold text-amber transition hover:bg-amber-500/5"
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
        {visible.map((e) => (
          <div key={e.id} className="glass-card flex items-center gap-3 rounded-2xl p-3.5">
            <button
              onClick={() => togglePaid.mutate({ id: e.id, is_paid: !e.is_paid })}
              className={e.is_paid ? "text-emerald-400" : "text-muted-foreground"}
              aria-label="تبديل حالة الدفع"
            >
              {e.is_paid ? <CheckCircle2 size={22} /> : <Circle size={22} />}
            </button>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-bold">{e.title}</div>
              <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                {e.category}
                {e.party ? ` · ${e.party}` : ""}
                {e.entry_date ? ` · ${e.entry_date}` : ""}
              </div>
            </div>
            <div className={`shrink-0 text-sm font-black tabular-nums ${e.entry_type === "income" ? "text-emerald-400" : "text-red-400"}`}>
              {e.entry_type === "income" ? "+" : "−"}{Number(e.amount).toLocaleString("en-US")}
            </div>
            <button onClick={() => remove.mutate(e.id)} className="shrink-0 text-muted-foreground hover:text-red-400" aria-label="حذف">
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
