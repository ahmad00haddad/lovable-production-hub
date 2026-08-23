import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { quotationsQuery, projectQuery } from "@/lib/queries";
import { toast } from "sonner";
import { Plus, FileText, ChevronLeft, Trash2 } from "lucide-react";

export const Route = createFileRoute("/p/$projectId/quotations")({
  head: () => ({
    meta: [
      { title: "عروض الأسعار والعقود — منصة الإنتاج" },
      { name: "description", content: "أنشئ عروض أسعار وعقوداً احترافية لمشاريع الإنتاج وشاركها مع العملاء مباشرة." },
      { property: "og:title", content: "عروض الأسعار والعقود" },
      { property: "og:description", content: "عروض أسعار وعقود احترافية لمشاريع الإنتاج، جاهزة للمشاركة والطباعة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context, params }) => {
    context.queryClient.ensureQueryData(projectQuery(params.projectId));
    context.queryClient.ensureQueryData(quotationsQuery(params.projectId));
  },
  pendingComponent: () => (
    <div className="flex h-64 items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
    </div>
  ),
  component: QuotationsPage,
});

const STATUS: Record<string, { label: string; cls: string }> = {
  draft: { label: "مسودة", cls: "bg-white/10 text-muted-foreground" },
  sent: { label: "مُرسل", cls: "bg-amber-500/15 text-amber" },
  accepted: { label: "مقبول", cls: "bg-emerald-500/15 text-emerald-400" },
  rejected: { label: "مرفوض", cls: "bg-red-500/15 text-red-400" },
};

function QuotationsPage() {
  const { projectId } = Route.useParams();
  const qc = useQueryClient();
  const router = useRouter();
  const { data: project } = useSuspenseQuery(projectQuery(projectId));
  const { data: quotes } = useSuspenseQuery(quotationsQuery(projectId));

  const create = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("quotations")
        .insert({
          project_id: projectId,
          title: `عرض سعر — ${project.name}`,
          quote_number: `Q-${String(quotes.length + 1).padStart(3, "0")}`,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["quotations", projectId] });
      router.navigate({ to: "/p/$projectId/quote/$qId", params: { projectId, qId: data.id } });
    },
    onError: () => toast.error("تعذر إنشاء العرض"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("quotations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quotations", projectId] });
      toast.success("تم الحذف");
    },
  });

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pb-28 pt-8">
      <header className="mb-6">
        <h1 className="text-2xl font-black">عروض الأسعار والعقود</h1>
        <p className="mt-1 text-xs text-muted-foreground">أنشئ عرضاً، أضف بنوده، ثم شاركه أو اطبعه كعقد.</p>
      </header>

      <button
        onClick={() => create.mutate()}
        disabled={create.isPending}
        className="mb-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-gradient py-3 text-sm font-bold text-black disabled:opacity-50"
      >
        <Plus size={16} /> عرض سعر جديد
      </button>

      <div className="space-y-2">
        {quotes.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-xs text-muted-foreground">
            لا توجد عروض أسعار بعد
          </div>
        )}
        {quotes.map((q) => {
          const st = STATUS[q.status] ?? STATUS['draft']!;
          return (
            <div key={q.id} className="glass-card flex items-center gap-2 rounded-2xl p-3.5">
              <Link
                to="/p/$projectId/quote/$qId"
                params={{ projectId, qId: q.id }}
                className="flex min-w-0 flex-1 items-center gap-3"
              >
                <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber">
                  <FileText size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold">{q.title}</div>
                  <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                    {q.quote_number ? `${q.quote_number} · ` : ""}
                    {q.client_name || "بدون عميل"}
                    {q.issue_date ? ` · ${q.issue_date}` : ""}
                  </div>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${st.cls}`}>{st.label}</span>
                <ChevronLeft className="shrink-0 text-muted-foreground" size={18} />
              </Link>
              <button onClick={() => remove.mutate(q.id)} className="shrink-0 text-muted-foreground hover:text-red-400" aria-label="حذف">
                <Trash2 size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
