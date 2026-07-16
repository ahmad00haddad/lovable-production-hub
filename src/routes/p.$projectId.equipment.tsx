import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { equipmentQuery } from "@/lib/queries";
import { ProgressBar } from "@/components/ProgressRing";
import { ChevronRight, Plus, Check, Trash2, Home, Search, Minus } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/AuthProvider";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/p/$projectId/equipment")({
  loader: ({ context, params }) => {
    context.queryClient.ensureQueryData(equipmentQuery(params.projectId));
  },
  component: EquipmentPage,
  errorComponent: ({ error }) => (
    <div className="p-6 text-center text-sm text-muted-foreground">تعذر تحميل الصفحة: {error.message}</div>
  ),
  notFoundComponent: () => <div className="p-6 text-center">غير موجود</div>,
});

function EquipmentPage() {
  const { projectId } = Route.useParams();
  const router = useRouter();
  const qc = useQueryClient();
  const { data: equipment } = useSuspenseQuery(equipmentQuery(projectId));
  const { actorName } = useAuth();
  const [q, setQ] = useState("");
  const [activeCat, setActiveCat] = useState<string>("");
  const [newName, setNewName] = useState("");
  const [newCat, setNewCat] = useState("الجريبت والإكسسوارات");

  const toggle = useMutation({
    mutationFn: async (e: { id: string; is_secured: boolean }) => {
      const { error } = await supabase
        .from("equipment")
        .update({ is_secured: !e.is_secured })
        .eq("id", e.id);
      if (error) throw error;

      const { error: logError } = await supabase.from("activity_log").insert({
        project_id: projectId,
        actor_name: actorName || "عضو بالفريق",
        item_type: "معدة",
        item_id: e.id,
        action_type: !e.is_secured ? "تم الجلب" : "إلغاء الجلب"
      });
      if (logError) console.error("Activity log error:", logError);
    },
    onMutate: async (newGear) => {
      await qc.cancelQueries({ queryKey: ["equipment", projectId] });
      const previous = qc.getQueryData(["equipment", projectId]);
      qc.setQueryData(["equipment", projectId], (old: any) =>
        old?.map((e: any) =>
          e.id === newGear.id ? { ...e, is_secured: !newGear.is_secured } : e
        )
      );
      if (!newGear.is_secured) {
        toast.success("تم جلب المعدة بنجاح!");
      }
      return { previous };
    },
    onError: (err, newGear, context) => {
      qc.setQueryData(["equipment", projectId], context?.previous);
      toast.error("حدث خطأ في الحفظ");
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["equipment", projectId] });
    },
  });

  const updateQty = useMutation({
    mutationFn: async ({ id, quantity }: { id: string; quantity: number }) => {
      const { error } = await supabase
        .from("equipment")
        .update({ quantity: Math.max(1, quantity) })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["equipment", projectId] }),
  });

  const addEquipment = useMutation({
    mutationFn: async ({ name, category }: { name: string; category: string }) => {
      const { error } = await supabase.from("equipment").insert({ project_id: projectId, name, category });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewName("");
      qc.invalidateQueries({ queryKey: ["equipment", projectId] });
      toast.success("تمت إضافة المعدة");
    },
  });

  const deleteEquipment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("equipment").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["equipment", projectId] });
      toast.success("تم الحذف");
    },
  });

  const categories = useMemo(
    () => Array.from(new Set(equipment.map((e) => e.category))),
    [equipment]
  );

  const filtered = equipment.filter((e) => {
    if (activeCat && e.category !== activeCat) return false;
    if (q && !e.name.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const grouped = filtered.reduce<Record<string, typeof equipment>>((acc, e) => {
    (acc[e.category] ??= []).push(e);
    return acc;
  }, {});

  const done = equipment.filter((e) => e.is_secured).length;
  const pct = equipment.length ? (done / equipment.length) * 100 : 0;

  return (
    <div className="mx-auto min-h-dvh max-w-md px-5 pb-40 pt-6">
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

      <header className="glass-card mb-4 rounded-2xl p-5">
        <div className="text-xs text-amber">قائمة المعدات المشتركة</div>
        <h1 className="mt-1 text-2xl font-black">جاهزية العتاد</h1>
        <div className="mt-4 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            {done} / {equipment.length} قطعة تم تأمينها
          </span>
          <span className="font-bold text-amber tabular-nums">{Math.round(pct)}%</span>
        </div>
        <div className="mt-2">
          <ProgressBar value={pct} />
        </div>
      </header>

      <div className="mb-3 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
        <Search size={16} className="text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ابحث عن قطعة…"
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      <div className="-mx-5 mb-4 overflow-x-auto px-5">
        <div className="flex min-w-max gap-2">
          <button
            onClick={() => setActiveCat("")}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ${
              !activeCat ? "bg-amber-gradient" : "border border-white/10 bg-white/5 text-muted-foreground"
            }`}
          >
            الكل
          </button>
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setActiveCat(c === activeCat ? "" : c)}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ${
                activeCat === c
                  ? "bg-amber-gradient"
                  : "border border-white/10 bg-white/5 text-muted-foreground"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-5">
        {Object.entries(grouped).map(([cat, items]) => (
          <section key={cat}>
            <div className="mb-2 flex items-center justify-between px-1">
              <h3 className="text-sm font-bold text-amber">{cat}</h3>
              <span className="text-[10px] text-muted-foreground">
                {items.filter((i) => i.is_secured).length}/{items.length}
              </span>
            </div>
            <ul className="space-y-2">
              {items.map((e) => (
                <li
                  key={e.id}
                  className={`glass-card group flex items-center gap-3 rounded-2xl p-3.5 transition ${
                    e.is_secured ? "opacity-55" : ""
                  }`}
                >
                  <button
                    onClick={() => toggle.mutate({ id: e.id, is_secured: e.is_secured })}
                    className={`grid h-6 w-6 shrink-0 place-items-center rounded-md border ${
                      e.is_secured
                        ? "border-transparent bg-amber-gradient"
                        : "border-white/25 bg-white/5 active:scale-90"
                    }`}
                  >
                    {e.is_secured && <Check size={14} strokeWidth={3} />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div
                      className={`text-sm font-medium ${
                        e.is_secured ? "text-muted-foreground line-through" : ""
                      }`}
                    >
                      {e.name}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-1.5 py-1 text-xs">
                    <button
                      onClick={() => updateQty.mutate({ id: e.id, quantity: e.quantity - 1 })}
                      className="text-muted-foreground active:scale-90"
                      aria-label="أقل"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="w-5 text-center font-bold tabular-nums">{e.quantity}</span>
                    <button
                      onClick={() => updateQty.mutate({ id: e.id, quantity: e.quantity + 1 })}
                      className="text-muted-foreground active:scale-90"
                      aria-label="أكثر"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button
                        className="text-muted-foreground opacity-0 transition group-hover:opacity-100 active:opacity-100 hover:text-red-500"
                        aria-label="حذف"
                      >
                        <Trash2 size={14} />
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="max-w-[90vw] sm:max-w-md rounded-2xl border-white/10 bg-background/95 backdrop-blur-xl p-6">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-right text-lg font-black text-amber">حذف المعدة</AlertDialogTitle>
                        <AlertDialogDescription className="text-right text-sm leading-relaxed text-muted-foreground">
                          هل أنت متأكد من حذف هذه القطعة؟ لا يمكن التراجع عن هذا الإجراء.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="flex items-center gap-2 mt-4 sm:justify-end">
                        <AlertDialogCancel className="w-full sm:w-auto mt-0 border-white/10 bg-white/5 hover:bg-white/10 hover:text-white rounded-xl">
                          إلغاء
                        </AlertDialogCancel>
                        <AlertDialogAction 
                          className="w-full sm:w-auto bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white rounded-xl transition"
                          onClick={() => deleteEquipment.mutate(e.id)}
                        >
                          نعم، احذف
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </li>
              ))}
            </ul>
          </section>
        ))}
        {filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/10 py-8 text-center text-xs text-muted-foreground">
            لا توجد نتائج
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const n = newName.trim();
          if (n) addEquipment.mutate({ name: n, category: newCat });
        }}
        className="fixed inset-x-0 bottom-0 z-10 mx-auto max-w-md p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
      >
        <div className="glass-card space-y-2 rounded-2xl p-2.5">
          <div className="flex items-center gap-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="أضف قطعة معدات…"
              className="flex-1 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
            />
            <button
              type="submit"
              disabled={!newName.trim() || addEquipment.isPending}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-amber-gradient disabled:opacity-40"
            >
              <Plus size={18} strokeWidth={2.5} />
            </button>
          </div>
          <select
            value={newCat}
            onChange={(e) => setNewCat(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs outline-none"
          >
            {categories.map((c) => (
              <option key={c} value={c} className="bg-slate-900">
                {c}
              </option>
            ))}
          </select>
        </div>
      </form>
    </div>
  );
}
