import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { teamQuery, tasksQuery } from "@/lib/queries";
import { ProgressBar } from "@/components/ProgressRing";
import { ChevronRight, Plus, Check, Trash2, Home, Edit2, Calendar, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/AuthProvider";

export const Route = createFileRoute("/p/$projectId/member/$id")({
  loader: ({ context, params }) => {
    context.queryClient.ensureQueryData(teamQuery(params.projectId));
    context.queryClient.ensureQueryData(tasksQuery(params.projectId, params.id));
  },
  component: MemberPage,
  errorComponent: ({ error }) => (
    <div className="p-6 text-center text-sm text-muted-foreground">تعذر تحميل الصفحة: {error.message}</div>
  ),
  notFoundComponent: () => <div className="p-6 text-center">العضو غير موجود</div>,
});

type Filter = "all" | "pending" | "done";

function MemberPage() {
  const { id, projectId } = Route.useParams();
  const router = useRouter();
  const qc = useQueryClient();
  const { data: team } = useSuspenseQuery(teamQuery(projectId));
  const { data: tasks } = useSuspenseQuery(tasksQuery(projectId, id));
  const member = team.find((m) => m.id === id);

  const { actorName } = useAuth();
  const [filter, setFilter] = useState<Filter>("all");
  const [newTitle, setNewTitle] = useState("");
  const [editingTask, setEditingTask] = useState<{ id: string; title: string; due_date: string } | null>(null);

  const updateTaskDetails = useMutation({
    mutationFn: async (t: { id: string; title: string; due_date: string | null }) => {
      const { error } = await supabase
        .from("tasks")
        .update({ title: t.title, due_date: t.due_date || null })
        .eq("id", t.id);
      if (error) throw error;
      
      const { error: logError } = await supabase.from("activity_log").insert({
        project_id: projectId,
        actor_name: actorName || "عضو بالفريق",
        item_type: "مهمة",
        item_id: t.id,
        action_type: "تعديل المهمة"
      });
      if (logError) console.error("Activity log error:", logError);
    },
    onSuccess: () => {
      setEditingTask(null);
      qc.invalidateQueries({ queryKey: ["tasks", projectId] });
      toast.success("تم التحديث");
    },
  });

  const toggle = useMutation({
    mutationFn: async (t: { id: string; is_completed: boolean }) => {
      const { error } = await supabase
        .from("tasks")
        .update({ is_completed: !t.is_completed })
        .eq("id", t.id);
      if (error) throw error;

      const { error: logError } = await supabase.from("activity_log").insert({
        project_id: projectId,
        actor_name: actorName || "عضو بالفريق",
        item_type: "مهمة",
        item_id: t.id,
        action_type: !t.is_completed ? "إتمام المهمة" : "إلغاء إتمام المهمة"
      });
      if (logError) console.error("Activity log error:", logError);
    },
    onMutate: async (newItem) => {
      await qc.cancelQueries({ queryKey: ["tasks", projectId] });
      const previous = qc.getQueryData(["tasks", projectId, id]);
      qc.setQueryData(["tasks", projectId, id], (old: any) =>
        old?.map((t: any) =>
          t.id === newItem.id ? { ...t, is_completed: !newItem.is_completed } : t
        )
      );
      if (!newItem.is_completed) {
        toast.success("تم إنجاز المهمة");
      }
      return { previous };
    },
    onError: (err, newItem, context) => {
      qc.setQueryData(["tasks", projectId, id], context?.previous);
      toast.error("حدث خطأ في الحفظ");
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["tasks", projectId] });
    },
  });

  const addTask = useMutation({
    mutationFn: async (title: string) => {
      const { error } = await supabase.from("tasks").insert({ project_id: projectId, team_member_id: id, title });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewTitle("");
      qc.invalidateQueries({ queryKey: ["tasks", projectId] });
      toast.success("تمت إضافة المهمة");
    },
  });

  const deleteTask = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks", projectId] }),
  });

  if (!member) return null;

  const done = tasks.filter((t) => t.is_completed).length;
  const pct = tasks.length ? (done / tasks.length) * 100 : 0;

  const filtered = tasks.filter((t) =>
    filter === "all" ? true : filter === "pending" ? !t.is_completed : t.is_completed
  );

  const SHOOT_DATE = "2026-08-02";
  const preProductionTasks = filtered.filter(t => !t.due_date || t.due_date < SHOOT_DATE);
  const productionTasks = filtered.filter(t => t.due_date && t.due_date >= SHOOT_DATE);

  const renderTask = (t: any) => (
    <li
      key={t.id}
      className={`glass-card group flex flex-col gap-3 rounded-2xl p-4 transition ${
        t.is_completed && editingTask?.id !== t.id ? "opacity-55" : ""
      }`}
    >
      {editingTask?.id === t.id ? (
        <form
          className="flex w-full flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (editingTask!.title.trim()) {
              updateTaskDetails.mutate({
                id: t.id,
                title: editingTask!.title,
                due_date: editingTask!.due_date
              });
            }
          }}
        >
          <input
            autoFocus
            value={editingTask!.title}
            onChange={(e) => setEditingTask({ ...editingTask!, title: e.target.value })}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none"
            placeholder="عنوان المهمة"
          />
          <div className="flex items-center gap-2">
            <div className="flex flex-1 items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
              <Calendar size={14} className="text-muted-foreground" />
              <input
                type="date"
                value={editingTask!.due_date}
                onChange={(e) => setEditingTask({ ...editingTask!, due_date: e.target.value })}
                className="flex-1 bg-transparent text-sm outline-none [color-scheme:dark]"
              />
            </div>
            <button type="submit" className="rounded-lg bg-amber-gradient px-4 py-2 text-sm font-bold text-black disabled:opacity-50" disabled={!editingTask!.title.trim() || updateTaskDetails.isPending}>
              حفظ
            </button>
            <button type="button" onClick={() => setEditingTask(null)} className="rounded-lg border border-white/10 bg-white/5 p-2 text-muted-foreground">
              <X size={18} />
            </button>
          </div>
        </form>
      ) : (
        <div className="flex w-full items-start gap-3">
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
            {t.due_date && (
              <div className="mt-2 flex items-center gap-1.5 text-[11px] text-amber">
                <Calendar size={12} />
                <span dir="ltr" className="font-medium">{new Date(t.due_date).toLocaleDateString('en-CA')}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
            <button
              onClick={() => setEditingTask({ id: t.id, title: t.title, due_date: t.due_date || "" })}
              className="text-muted-foreground hover:text-white"
              aria-label="تعديل"
            >
              <Edit2 size={15} />
            </button>
            <button
              onClick={() => {
                if (confirm("حذف المهمة؟")) deleteTask.mutate(t.id);
              }}
              className="text-muted-foreground hover:text-white"
              aria-label="حذف"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      )}
    </li>
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
        <Link to="/p/$projectId" params={{ projectId }} className="rounded-full border border-white/10 bg-white/5 p-2 text-muted-foreground active:scale-95">
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

      <div className="space-y-6">
        {preProductionTasks.length > 0 && (
          <section>
            <div className="mb-3 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-amber" />
              <h2 className="text-sm font-bold text-muted-foreground">مهام التحضير (قبل 2 آب)</h2>
            </div>
            <ul className="space-y-2">
              {preProductionTasks.map(renderTask)}
            </ul>
          </section>
        )}

        {productionTasks.length > 0 && (
          <section>
            <div className="mb-3 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-red-500" />
              <h2 className="text-sm font-bold text-muted-foreground">مهام أيام التصوير (2 - 5 آب)</h2>
            </div>
            <ul className="space-y-2">
              {productionTasks.map(renderTask)}
            </ul>
          </section>
        )}

        {filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/10 py-8 text-center text-xs text-muted-foreground">
            لا توجد مهام هنا
          </div>
        )}
      </div>

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
