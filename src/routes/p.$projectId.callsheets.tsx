import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { callSheetsQuery, projectQuery } from "@/lib/queries";
import { toast } from "sonner";
import { Plus, CalendarDays, MapPin, Clock, ChevronLeft, Trash2 } from "lucide-react";

export const Route = createFileRoute("/p/$projectId/callsheets")({
  head: () => ({
    meta: [
      { title: "جداول التصوير — منصة الإنتاج" },
      { name: "description", content: "أنشئ جداول التصوير وقوائم اللقطات وشاركها مع الفريق برابط مباشر." },
      { property: "og:title", content: "جداول التصوير — منصة الإنتاج" },
      { property: "og:description", content: "جداول تصوير حيّة تتحدث أمام الفريق لحظة بلحظة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context, params }) => {
    context.queryClient.ensureQueryData(projectQuery(params.projectId));
    context.queryClient.ensureQueryData(callSheetsQuery(params.projectId));
  },
  pendingComponent: () => (
    <div className="flex h-64 items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
    </div>
  ),
  component: CallSheetsPage,
});

function CallSheetsPage() {
  const { projectId } = Route.useParams();
  const qc = useQueryClient();
  const { data: project } = useSuspenseQuery(projectQuery(projectId));
  const { data: sheets } = useSuspenseQuery(callSheetsQuery(projectId));

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [shootDate, setShootDate] = useState(project.start_date || "");
  const [callTime, setCallTime] = useState("");
  const [locationName, setLocationName] = useState("");

  const createSheet = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("call_sheets")
        .insert({
          project_id: projectId,
          title: title.trim(),
          shoot_date: shootDate || null,
          call_time: callTime || null,
          location_name: locationName.trim() || null,
          sort_order: sheets.length,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["call_sheets", projectId] });
      setShowForm(false);
      setTitle("");
      setCallTime("");
      setLocationName("");
      toast.success("تم إنشاء جدول التصوير");
    },
    onError: () => toast.error("تعذر إنشاء الجدول"),
  });

  const deleteSheet = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("call_sheets").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["call_sheets", projectId] });
      toast.success("تم الحذف");
    },
  });

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      <header className="mb-5">
        <h1 className="text-2xl font-black">جداول التصوير</h1>
        <p className="text-xs text-muted-foreground mt-1">
          كل جدول يحتوي على وقت الحضور، الموقع، الطقس، وقائمة اللقطات — ويتحدث مباشرة أمام الفريق.
        </p>
      </header>

      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="mb-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-gradient py-3 font-bold text-black active:scale-[0.98] transition"
        >
          <Plus size={18} strokeWidth={2.5} /> جدول تصوير جديد
        </button>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (title.trim()) createSheet.mutate();
          }}
          className="glass-card mb-5 space-y-3 rounded-2xl p-4"
        >
          <input
            autoFocus
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="عنوان اليوم — مثال: اليوم الأول، مشاهد الاستوديو"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm outline-none"
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs text-muted-foreground">تاريخ التصوير</label>
              <input
                type="date"
                value={shootDate}
                onChange={(e) => setShootDate(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none [color-scheme:dark]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-muted-foreground">وقت الحضور</label>
              <input
                type="time"
                value={callTime}
                onChange={(e) => setCallTime(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none [color-scheme:dark]"
              />
            </div>
          </div>
          <input
            value={locationName}
            onChange={(e) => setLocationName(e.target.value)}
            placeholder="الموقع — مثال: عمّان، استوديو الجاردنز"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm outline-none"
          />
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={createSheet.isPending || !title.trim()}
              className="flex-1 rounded-xl bg-amber-gradient py-2.5 font-bold text-black disabled:opacity-50"
            >
              إنشاء
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-xl bg-white/10 px-4 py-2.5 text-sm"
            >
              إلغاء
            </button>
          </div>
        </form>
      )}

      {sheets.length === 0 ? (
        <div className="glass-card rounded-2xl p-8 text-center text-sm text-muted-foreground">
          لا توجد جداول تصوير بعد. ابدأ بإنشاء يوم التصوير الأول.
        </div>
      ) : (
        <ul className="space-y-3">
          {sheets.map((s) => (
            <li key={s.id} className="glass-card rounded-2xl p-4">
              <div className="flex items-start justify-between gap-3">
                <Link
                  to="/p/$projectId/callsheet/$csId"
                  params={{ projectId, csId: s.id }}
                  className="flex-1"
                >
                  <div className="flex items-center gap-2 font-bold">
                    {s.title}
                    <ChevronLeft size={16} className="text-amber" />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {s.shoot_date && (
                      <span className="flex items-center gap-1">
                        <CalendarDays size={13} /> {s.shoot_date}
                      </span>
                    )}
                    {s.call_time && (
                      <span className="flex items-center gap-1">
                        <Clock size={13} /> {s.call_time}
                      </span>
                    )}
                    {s.location_name && (
                      <span className="flex items-center gap-1">
                        <MapPin size={13} /> {s.location_name}
                      </span>
                    )}
                  </div>
                </Link>
                <button
                  onClick={() => deleteSheet.mutate(s.id)}
                  className="rounded-lg p-2 text-muted-foreground hover:bg-white/5 hover:text-red-400"
                  aria-label="حذف الجدول"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
