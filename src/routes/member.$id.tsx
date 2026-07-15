import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { teamQuery, tasksQuery } from "@/lib/queries";
import { ProgressBar } from "@/components/ProgressRing";
import { ChevronRight, Plus, Check, Trash2, Home } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/member/$id")({
  loader: ({ context, params }) => {
    context.queryClient.ensureQueryData(teamQuery);
    context.queryClient.ensureQueryData(tasksQuery(params.id));
  },
  component: MemberPage,
  errorComponent: ({ error }) => (
    <div className="p-6 text-center text-sm text-muted-foreground">تعذر تحميل الصفحة: {error.message}</div>
  ),
  notFoundComponent: () => <div className="p-6 text-center">العضو غير موجود</div>,
});

type Filter = "all" | "pending" | "done";

function MemberPage() {
  const { id } = Route.useParams();
  const router = useRouter();
  const qc = useQueryClient();
  const { data: team } = useSuspenseQuery(teamQuery);
  const { data: tasks } = useSuspenseQuery(tasksQuery(id));
  const member = team.find((m) => m.id === id);

  const [filter, setFilter] = useState<Filter>("all");
  const [newTitle, setNewTitle] = useState("");

  const toggle = useMutation({
    mutationFn: async (t: { id: string; is_completed: boolean }) => {
      const { error } = await supabase
        .from("tasks")
        .update({ is_completed: !t.is_completed })
        .eq("id", t.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const addTask = useMutation({
    mutationFn: async (title: string) => {
      const { error } = await supabase.from("tasks").insert({ team_member_id: id, title });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewTitle("");
      qc.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("تمت إضافة المهمة");
    },
  });

  const deleteTask = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  if (!member) return null;

  const done = tasks.filter((t) => t.is_completed).length;
  const pct = tasks.length ? (done / tasks.length) * 100 : 0;

  const filtered = tasks.filter((t) =>
    filter === "all" ? true : filter === "pending" ? !t.is_completed : t.is_completed
  );

  return (
    <div className="mx-auto min-h-dvh max-w-md px-5 pb-32 pt-6">
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={() => router.history.back()}
          className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-muted-foreground active:scale-95"
        >
          <ChevronRight size={14} />
          رجوع
        </button>
        <Link to="/" className="rounded-full border border-white/10 bg-white/5 p-2 text-muted-foreground active:scale-95">
          <Home size={14} />
        </Link>
      </div>

      <header className="glass-card mb-5 rounded-2xl p-5">
        <div className="text-xs text-amber">{member.role}</div>
        <h1 className="mt-1 text-2xl font-black">{member.name}</h1>
        <div className="mt-4 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            {done} / {tasks.length} مهمة مكتملة
          </span>
          <span className="font-bold text-amber tabular-nums">{Math.round(pct)}%</span>
        </div>
        <div className="mt-2">
          <ProgressBar value={pct} />
        </div>
      </header>

      <div className="mb-4 flex gap-2">
        {(
          [
            ["all", "الكل"],
            ["pending", "المتبقي"],
            ["done", "المكتمل"],
          ] as const
        ).map(([k, l]) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={`flex-1 rounded-full py-2 text-xs font-semibold transition ${
              filter === k
                ? "bg-amber-gradient"
                : "border border-white/10 bg-white/5 text-muted-foreground"
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      <ul className="space-y-2">
        {filtered.map((t) => (
          <li
            key={t.id}
            className={`glass-card group flex items-start gap-3 rounded-2xl p-4 transition ${
              t.is_completed ? "opacity-55" : ""
            }`}
          >
            <button
              onClick={() => toggle.mutate({ id: t.id, is_completed: t.is_completed })}
              className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md border transition ${
                t.is_completed
                  ? "border-transparent bg-amber-gradient"
                  : "border-white/25 bg-white/5 active:scale-90"
              }`}
              aria-label="إتمام"
            >
              {t.is_completed && <Check size={14} strokeWidth={3} />}
            </button>
            <div className="min-w-0 flex-1">
              <div
                className={`text-sm leading-relaxed ${
                  t.is_completed ? "text-muted-foreground line-through" : ""
                }`}
              >
                {t.title}
              </div>
            </div>
            <button
              onClick={() => {
                if (confirm("حذف المهمة؟")) deleteTask.mutate(t.id);
              }}
              className="opacity-0 transition group-hover:opacity-100 text-muted-foreground active:opacity-100"
              aria-label="حذف"
            >
              <Trash2 size={15} />
            </button>
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="rounded-2xl border border-dashed border-white/10 py-8 text-center text-xs text-muted-foreground">
            لا توجد مهام هنا
          </li>
        )}
      </ul>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const t = newTitle.trim();
          if (t) addTask.mutate(t);
        }}
        className="fixed inset-x-0 bottom-0 z-10 mx-auto max-w-md p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
      >
        <div className="glass-card flex items-center gap-2 rounded-2xl p-2">
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="أضف مهمة جديدة…"
            className="flex-1 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
          />
          <button
            type="submit"
            disabled={!newTitle.trim() || addTask.isPending}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-amber-gradient disabled:opacity-40"
          >
            <Plus size={18} strokeWidth={2.5} />
          </button>
        </div>
      </form>
    </div>
  );
}
