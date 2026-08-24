import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { quotationQuery, quotationItemsQuery, projectQuery } from "@/lib/queries";
import { toast } from "sonner";
import {
  Plus, Trash2, Share2, Printer, ChevronRight, FileSignature, Save,
} from "lucide-react";

export const Route = createFileRoute("/p/$projectId/quote/$qId")({
  head: () => ({
    meta: [
      { title: "تفاصيل عرض السعر — منصة الإنتاج" },
      { name: "description", content: "حرّر بنود عرض السعر، الضريبة والخصم، ونص العقد، ثم شاركه أو اطبعه للعميل." },
      { property: "og:title", content: "تفاصيل عرض السعر والعقد" },
      { property: "og:description", content: "بنود عرض السعر، الإجماليات، ونص العقد جاهز للمشاركة." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context, params }) => {
    context.queryClient.ensureQueryData(projectQuery(params.projectId));
    context.queryClient.ensureQueryData(quotationQuery(params.projectId, params.qId));
    context.queryClient.ensureQueryData(quotationItemsQuery(params.projectId, params.qId));
  },
  pendingComponent: () => (
    <div className="flex h-64 items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
    </div>
  ),
  errorComponent: () => (
    <div className="p-8 text-center text-sm text-muted-foreground">تعذر تحميل العرض</div>
  ),
  notFoundComponent: () => (
    <div className="p-8 text-center text-sm text-muted-foreground">العرض غير موجود</div>
  ),
  component: QuoteDetail,
});

const STATUSES = [
  ["draft", "مسودة"],
  ["sent", "مُرسل"],
  ["accepted", "مقبول"],
  ["rejected", "مرفوض"],
] as const;

function QuoteDetail() {
  const { projectId, qId } = Route.useParams();
  const qc = useQueryClient();
  const { data: quote } = useSuspenseQuery(quotationQuery(projectId, qId));
  const { data: items } = useSuspenseQuery(quotationItemsQuery(projectId, qId));

  const [newItem, setNewItem] = useState({ description: "", quantity: "1", unit_price: "" });
  const [head, setHead] = useState({
    title: quote?.title ?? "",
    quote_number: quote?.quote_number ?? "",
    client_name: quote?.client_name ?? "",
    client_contact: quote?.client_contact ?? "",
    issue_date: quote?.issue_date ?? "",
    valid_until: quote?.valid_until ?? "",
    currency: quote?.currency ?? "JOD",
    tax_percent: String(quote?.tax_percent ?? 0),
    discount: String(quote?.discount ?? 0),
    notes: quote?.notes ?? "",
    terms: quote?.terms ?? "",
    contract_body: quote?.contract_body ?? "",
    signature_name: quote?.signature_name ?? "",
  });

  if (!quote) return <div className="p-8 text-center text-sm text-muted-foreground">العرض غير موجود</div>;

  const currency = head.currency || "JOD";
  const subtotal = items.reduce((s, i) => s + Number(i.quantity) * Number(i.unit_price), 0);
  const discount = Number(head.discount || 0);
  const taxable = Math.max(subtotal - discount, 0);
  const tax = (taxable * Number(head.tax_percent || 0)) / 100;
  const total = taxable + tax;

  const fmt = (n: number) =>
    `${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;

  const saveHead = useMutation({
    mutationFn: async (patch?: { status: string }) => {
      const { error } = await supabase
        .from("quotations")
        .update(
          patch ?? {
            title: head.title.trim() || "عرض سعر",
            quote_number: head.quote_number.trim() || null,
            client_name: head.client_name.trim() || null,
            client_contact: head.client_contact.trim() || null,
            issue_date: head.issue_date || null,
            valid_until: head.valid_until || null,
            currency: head.currency.trim() || "JOD",
            tax_percent: Number(head.tax_percent || 0),
            discount: Number(head.discount || 0),
            notes: head.notes.trim() || null,
            terms: head.terms.trim() || null,
            contract_body: head.contract_body.trim() || null,
            signature_name: head.signature_name.trim() || null,
          }
        )
        .eq("id", qId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quotation", projectId, qId] });
      qc.invalidateQueries({ queryKey: ["quotations", projectId] });
      toast.success("تم الحفظ");
    },
    onError: () => toast.error("تعذر الحفظ"),
  });

  const addItem = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("quotation_items").insert({
        project_id: projectId,
        quotation_id: qId,
        description: newItem.description.trim(),
        quantity: Number(newItem.quantity || 1),
        unit_price: Number(newItem.unit_price || 0),
        sort_order: items.length,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quotation_items", projectId, qId] });
      setNewItem({ description: "", quantity: "1", unit_price: "" });
    },
    onError: () => toast.error("تعذر إضافة البند"),
  });

  const removeItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("quotation_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quotation_items", projectId, qId] }),
  });

  const sign = useMutation({
    mutationFn: async () => {
      if (!head.signature_name.trim()) throw new Error("no-name");
      const { error } = await supabase
        .from("quotations")
        .update({
          signature_name: head.signature_name.trim(),
          signed_at: new Date().toISOString(),
          status: "accepted",
        })
        .eq("id", qId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quotation", projectId, qId] });
      qc.invalidateQueries({ queryKey: ["quotations", projectId] });
      toast.success("تم توقيع العقد إلكترونياً");
    },
    onError: () => toast.error("اكتب اسم الموقّع أولاً"),
  });

  const shareText = () => {
    const lines = [
      head.title,
      head.quote_number ? `رقم العرض: ${head.quote_number}` : "",
      head.client_name ? `العميل: ${head.client_name}` : "",
      "",
      ...items.map((i) => `• ${i.description} — ${i.quantity} × ${Number(i.unit_price)} = ${fmt(Number(i.quantity) * Number(i.unit_price))}`),
      "",
      `المجموع: ${fmt(subtotal)}`,
      discount ? `الخصم: ${fmt(discount)}` : "",
      Number(head.tax_percent) ? `الضريبة (${head.tax_percent}%): ${fmt(tax)}` : "",
      `الإجمالي: ${fmt(total)}`,
      "",
      typeof window !== "undefined" ? window.location.href : "",
    ];
    return lines.filter(Boolean).join("\n");
  };

  const onShare = async () => {
    const text = shareText();
    try {
      if (navigator.share) await navigator.share({ title: head.title, text });
      else {
        await navigator.clipboard.writeText(text);
        toast.success("تم نسخ العرض");
      }
    } catch { /* cancelled */ }
  };

  const input = "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-amber-500/50";

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pb-28 pt-8">
      <Link
        to="/p/$projectId/quotations"
        params={{ projectId }}
        className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-white"
      >
        <ChevronRight size={14} /> كل العروض
      </Link>

      <header className="mb-5">
        <h1 className="text-2xl font-black">{head.title || "عرض سعر"}</h1>
        <div className="mt-1 text-xs text-muted-foreground">
          {quote.signed_at
            ? `موقّع من ${quote.signature_name} · ${new Date(quote.signed_at).toLocaleDateString("en-CA")}`
            : "غير موقّع بعد"}
        </div>
      </header>

      <div className="mb-4 flex gap-2">
        <button onClick={onShare} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber-gradient py-2.5 text-xs font-bold text-black">
          <Share2 size={14} /> مشاركة
        </button>
        <button onClick={() => window.print()} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs font-bold">
          <Printer size={14} /> طباعة / PDF
        </button>
      </div>

      <div className="mb-4 flex gap-2 overflow-x-auto">
        {STATUSES.map(([key, label]) => (
          <button
            key={key}
            onClick={() => saveHead.mutate({ status: key })}
            className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-bold transition ${
              quote.status === key ? "bg-amber-gradient text-black" : "border border-white/10 bg-white/5 text-muted-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <section className="glass-card mb-4 space-y-2.5 rounded-2xl p-4">
        <div className="text-sm font-bold">بيانات العرض</div>
        <input value={head.title} onChange={(e) => setHead({ ...head, title: e.target.value })} placeholder="عنوان العرض" className={input} />
        <div className="grid grid-cols-2 gap-2">
          <input value={head.quote_number} onChange={(e) => setHead({ ...head, quote_number: e.target.value })} placeholder="رقم العرض" className={input} />
          <input value={head.currency} onChange={(e) => setHead({ ...head, currency: e.target.value })} placeholder="العملة" className={input} />
        </div>
        <input value={head.client_name} onChange={(e) => setHead({ ...head, client_name: e.target.value })} placeholder="اسم العميل" className={input} />
        <input value={head.client_contact} onChange={(e) => setHead({ ...head, client_contact: e.target.value })} placeholder="هاتف أو بريد العميل" className={input} />
        <div className="grid grid-cols-2 gap-2">
          <label className="text-[10px] text-muted-foreground">
            تاريخ الإصدار
            <input type="date" value={head.issue_date} onChange={(e) => setHead({ ...head, issue_date: e.target.value })} className={input} />
          </label>
          <label className="text-[10px] text-muted-foreground">
            صالح حتى
            <input type="date" value={head.valid_until} onChange={(e) => setHead({ ...head, valid_until: e.target.value })} className={input} />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-[10px] text-muted-foreground">
            الضريبة %
            <input value={head.tax_percent} onChange={(e) => setHead({ ...head, tax_percent: e.target.value })} inputMode="decimal" className={input} />
          </label>
          <label className="text-[10px] text-muted-foreground">
            الخصم
            <input value={head.discount} onChange={(e) => setHead({ ...head, discount: e.target.value })} inputMode="decimal" className={input} />
          </label>
        </div>
        <textarea value={head.notes} onChange={(e) => setHead({ ...head, notes: e.target.value })} placeholder="ملاحظات" rows={2} className={input} />
        <button
          onClick={() => saveHead.mutate(undefined)}
          disabled={saveHead.isPending}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 py-2 text-xs font-bold disabled:opacity-50"
        >
          <Save size={14} /> حفظ البيانات
        </button>
      </section>

      <section className="glass-card mb-4 rounded-2xl p-4">
        <div className="mb-3 text-sm font-bold">البنود</div>
        <div className="space-y-2">
          {items.length === 0 && <div className="py-4 text-center text-xs text-muted-foreground">لا توجد بنود بعد</div>}
          {items.map((i) => (
            <div key={i.id} className="flex items-center gap-2 rounded-xl bg-white/5 p-3">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold">{i.description}</div>
                <div className="text-[11px] tabular-nums text-muted-foreground">
                  {Number(i.quantity)} × {Number(i.unit_price).toLocaleString("en-US")}
                </div>
              </div>
              <div className="shrink-0 text-sm font-black tabular-nums text-amber">
                {fmt(Number(i.quantity) * Number(i.unit_price))}
              </div>
              <button onClick={() => removeItem.mutate(i.id)} className="shrink-0 text-muted-foreground hover:text-red-400" aria-label="حذف البند">
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>

        <div className="mt-3 space-y-2">
          <input value={newItem.description} onChange={(e) => setNewItem({ ...newItem, description: e.target.value })} placeholder="وصف البند (مثال: يوم تصوير كامل)" className={input} />
          <div className="grid grid-cols-2 gap-2">
            <input value={newItem.quantity} onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })} inputMode="decimal" placeholder="الكمية" className={input} />
            <input value={newItem.unit_price} onChange={(e) => setNewItem({ ...newItem, unit_price: e.target.value })} inputMode="decimal" placeholder="سعر الوحدة" className={input} />
          </div>
          <button
            onClick={() => newItem.description.trim() && addItem.mutate()}
            disabled={addItem.isPending || !newItem.description.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-amber-500/40 py-2 text-xs font-bold text-amber disabled:opacity-50"
          >
            <Plus size={14} /> إضافة بند
          </button>
        </div>

        <div className="mt-4 space-y-1.5 border-t border-white/10 pt-3 text-xs">
          <div className="flex justify-between"><span className="text-muted-foreground">المجموع</span><span className="tabular-nums">{fmt(subtotal)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">الخصم</span><span className="tabular-nums">{fmt(discount)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">الضريبة ({Number(head.tax_percent || 0)}%)</span><span className="tabular-nums">{fmt(tax)}</span></div>
          <div className="flex justify-between border-t border-white/10 pt-2 text-base font-black">
            <span>الإجمالي</span><span className="tabular-nums text-amber">{fmt(total)}</span>
          </div>
        </div>
      </section>

      <section className="glass-card space-y-2.5 rounded-2xl p-4">
        <div className="flex items-center gap-2 text-sm font-bold">
          <FileSignature size={16} className="text-amber" /> العقد والتوقيع
        </div>
        <textarea
          value={head.terms}
          onChange={(e) => setHead({ ...head, terms: e.target.value })}
          placeholder="الشروط والأحكام (طريقة الدفع، مدة التسليم، حقوق الاستخدام...)"
          rows={3}
          className={input}
        />
        <textarea
          value={head.contract_body}
          onChange={(e) => setHead({ ...head, contract_body: e.target.value })}
          placeholder="نص العقد الكامل"
          rows={5}
          className={input}
        />
        <input
          value={head.signature_name}
          onChange={(e) => setHead({ ...head, signature_name: e.target.value })}
          placeholder="اسم الموقّع"
          className={input}
        />
        <div className="flex gap-2">
          <button
            onClick={() => saveHead.mutate(undefined)}
            className="flex-1 rounded-xl bg-white/10 py-2 text-xs font-bold"
          >
            حفظ نص العقد
          </button>
          <button
            onClick={() => sign.mutate()}
            disabled={sign.isPending}
            className="flex-1 rounded-xl bg-amber-gradient py-2 text-xs font-bold text-black disabled:opacity-50"
          >
            توقيع إلكتروني
          </button>
        </div>
      </section>
    </div>
  );
}
