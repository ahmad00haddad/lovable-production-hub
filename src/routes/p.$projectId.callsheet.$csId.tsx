import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { callSheetQuery, shotsQuery, projectQuery } from "@/lib/queries";
import { fetchWeather, geocodePlace, mapsLink } from "@/lib/weather";
import { toast } from "sonner";
import {
  ChevronRight,
  MapPin,
  Clock,
  CalendarDays,
  Share2,
  Plus,
  Trash2,
  Check,
  Sun,
  Sunrise,
  Sunset,
  Image as ImageIcon,
  Save,
} from "lucide-react";

export const Route = createFileRoute("/p/$projectId/callsheet/$csId")({
  head: () => ({
    meta: [
      { title: "جدول التصوير — منصة الإنتاج" },
      { name: "description", content: "جدول تصوير حيّ: وقت الحضور، الموقع، الطقس، وقائمة اللقطات واللوحات القصصية." },
      { property: "og:title", content: "جدول التصوير — منصة الإنتاج" },
      { property: "og:description", content: "جدول تصوير حيّ يتحدث لحظة بلحظة أمام كل الفريق." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: async ({ context, params }) => {
    const sheet = await context.queryClient.ensureQueryData(
      callSheetQuery(params.projectId, params.csId),
    );
    if (!sheet) throw notFound();
    context.queryClient.ensureQueryData(shotsQuery(params.projectId, params.csId));
    context.queryClient.ensureQueryData(projectQuery(params.projectId));
  },
  pendingComponent: () => (
    <div className="flex h-64 items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
    </div>
  ),
  notFoundComponent: () => (
    <div className="p-8 text-center text-sm text-muted-foreground">جدول التصوير غير موجود.</div>
  ),
  errorComponent: () => (
    <div className="p-8 text-center text-sm text-muted-foreground">تعذر تحميل جدول التصوير.</div>
  ),
  component: CallSheetDetail,
});

const SHOT_SIZES = ["Wide", "Medium", "Close-up", "Extreme CU", "Over Shoulder", "POV"];
const MOVEMENTS = ["ثابت", "بان", "تيلت", "تراك", "زوم", "هاندهيلد", "جيمبال", "درون"];

function CallSheetDetail() {
  const { projectId, csId } = Route.useParams();
  const qc = useQueryClient();
  const { data: sheet } = useSuspenseQuery(callSheetQuery(projectId, csId));
  const { data: shots } = useSuspenseQuery(shotsQuery(projectId, csId));

  // Live updates for everyone holding the link
  useEffect(() => {
    const channel = supabase
      .channel(`callsheet-${csId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "shots", filter: `call_sheet_id=eq.${csId}` }, () => {
        qc.invalidateQueries({ queryKey: ["shots", projectId, csId] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "call_sheets", filter: `id=eq.${csId}` }, () => {
        qc.invalidateQueries({ queryKey: ["call_sheet", projectId, csId] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [csId, projectId, qc]);

  if (!sheet) return null;

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      <Link
        to="/p/$projectId/callsheets"
        params={{ projectId }}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-white"
      >
        <ChevronRight size={16} /> كل الجداول
      </Link>

      <SheetHeader sheet={sheet} projectId={projectId} />
      <WeatherCard sheet={sheet} projectId={projectId} csId={csId} />
      <ShotList projectId={projectId} csId={csId} shots={shots} />
    </div>
  );
}

type Sheet = NonNullable<ReturnType<typeof callSheetQuery> extends never ? never : any>;

function SheetHeader({ sheet, projectId }: { sheet: any; projectId: string }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    title: sheet.title ?? "",
    shoot_date: sheet.shoot_date ?? "",
    call_time: sheet.call_time ?? "",
    wrap_time: sheet.wrap_time ?? "",
    location_name: sheet.location_name ?? "",
    location_address: sheet.location_address ?? "",
    notes: sheet.notes ?? "",
  });

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("call_sheets")
        .update({
          title: form.title.trim(),
          shoot_date: form.shoot_date || null,
          call_time: form.call_time || null,
          wrap_time: form.wrap_time || null,
          location_name: form.location_name.trim() || null,
          location_address: form.location_address.trim() || null,
          notes: form.notes.trim() || null,
          ...(form.location_name.trim() !== (sheet.location_name ?? "") ? { lat: null, lng: null } : {}),
        })
        .eq("id", sheet.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["call_sheet", projectId, sheet.id] });
      qc.invalidateQueries({ queryKey: ["call_sheets", projectId] });
      setEditing(false);
      toast.success("تم حفظ الجدول");
    },
    onError: () => toast.error("تعذر الحفظ"),
  });

  const share = async () => {
    const url = window.location.href;
    const text = `${sheet.title} — رابط جدول التصوير المباشر`;
    try {
      if (navigator.share) await navigator.share({ title: sheet.title, text, url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success("تم نسخ رابط الجدول");
      }
    } catch {
      /* user cancelled */
    }
  };

  if (editing) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
        className="glass-card mb-4 space-y-3 rounded-2xl p-4"
      >
        <input
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold outline-none"
          placeholder="عنوان اليوم"
          required
        />
        <div className="grid grid-cols-3 gap-2">
          <input
            type="date"
            value={form.shoot_date}
            onChange={(e) => setForm({ ...form, shoot_date: e.target.value })}
            className="rounded-xl border border-white/10 bg-white/5 px-2 py-2 text-xs outline-none [color-scheme:dark]"
          />
          <input
            type="time"
            value={form.call_time}
            onChange={(e) => setForm({ ...form, call_time: e.target.value })}
            className="rounded-xl border border-white/10 bg-white/5 px-2 py-2 text-xs outline-none [color-scheme:dark]"
          />
          <input
            type="time"
            value={form.wrap_time}
            onChange={(e) => setForm({ ...form, wrap_time: e.target.value })}
            className="rounded-xl border border-white/10 bg-white/5 px-2 py-2 text-xs outline-none [color-scheme:dark]"
          />
        </div>
        <input
          value={form.location_name}
          onChange={(e) => setForm({ ...form, location_name: e.target.value })}
          placeholder="اسم الموقع/المدينة (يُستخدم للطقس)"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm outline-none"
        />
        <input
          value={form.location_address}
          onChange={(e) => setForm({ ...form, location_address: e.target.value })}
          placeholder="العنوان التفصيلي"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm outline-none"
        />
        <textarea
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          placeholder="ملاحظات لليوم (مواقف السيارات، الوجبات، تنبيهات...)"
          rows={3}
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm outline-none"
        />
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={save.isPending}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber-gradient py-2.5 font-bold text-black disabled:opacity-50"
          >
            <Save size={16} /> حفظ
          </button>
          <button type="button" onClick={() => setEditing(false)} className="rounded-xl bg-white/10 px-4 text-sm">
            إلغاء
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="glass-card mb-4 rounded-2xl p-4">
      <div className="flex items-start justify-between gap-2">
        <h1 className="text-xl font-black">{sheet.title}</h1>
        <div className="flex gap-1">
          <button onClick={share} className="rounded-lg bg-white/10 p-2 hover:bg-white/20" aria-label="مشاركة">
            <Share2 size={16} />
          </button>
          <button onClick={() => setEditing(true)} className="rounded-lg bg-white/10 px-3 py-2 text-xs font-bold">
            تعديل
          </button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        {sheet.shoot_date && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <CalendarDays size={14} className="text-amber" /> {sheet.shoot_date}
          </div>
        )}
        {sheet.call_time && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Clock size={14} className="text-amber" /> حضور {sheet.call_time}
            {sheet.wrap_time ? ` — انتهاء ${sheet.wrap_time}` : ""}
          </div>
        )}
      </div>

      {(sheet.location_name || sheet.location_address) && (
        <a
          href={mapsLink({ lat: sheet.lat, lng: sheet.lng, address: sheet.location_address || sheet.location_name })}
          target="_blank"
          rel="noreferrer"
          className="mt-3 flex items-center gap-2 rounded-xl bg-white/5 p-3 text-sm hover:bg-white/10"
        >
          <MapPin size={16} className="text-amber shrink-0" />
          <span className="flex-1">{sheet.location_address || sheet.location_name}</span>
          <span className="text-xs text-amber">فتح بالخرائط</span>
        </a>
      )}

      {sheet.notes && (
        <p className="mt-3 whitespace-pre-wrap rounded-xl bg-white/5 p-3 text-xs leading-relaxed text-muted-foreground">
          {sheet.notes}
        </p>
      )}
    </div>
  );
}

function WeatherCard({ sheet, projectId, csId }: { sheet: any; projectId: string; csId: string }) {
  const qc = useQueryClient();
  const place = sheet.location_name || sheet.location_address;

  const { data: coords } = useQuery({
    queryKey: ["geocode", csId, place, sheet.lat, sheet.lng],
    enabled: Boolean(place) || (sheet.lat != null && sheet.lng != null),
    staleTime: Infinity,
    queryFn: async () => {
      if (sheet.lat != null && sheet.lng != null) return { lat: sheet.lat as number, lng: sheet.lng as number };
      const hit = await geocodePlace(place as string);
      if (!hit) return null;
      await supabase.from("call_sheets").update({ lat: hit.lat, lng: hit.lng }).eq("id", csId);
      qc.invalidateQueries({ queryKey: ["call_sheet", projectId, csId] });
      return { lat: hit.lat, lng: hit.lng };
    },
  });

  const { data: weather } = useQuery({
    queryKey: ["weather", coords?.lat, coords?.lng, sheet.shoot_date],
    enabled: Boolean(coords),
    staleTime: 1000 * 60 * 30,
    queryFn: () => fetchWeather(coords!.lat, coords!.lng, sheet.shoot_date),
  });

  if (!place) return null;

  return (
    <div className="glass-card mb-4 rounded-2xl p-4">
      <div className="mb-2 flex items-center gap-2 text-xs font-bold text-muted-foreground">
        <Sun size={14} className="text-amber" /> حالة الطقس المتوقعة
      </div>
      {!weather ? (
        <div className="text-xs text-muted-foreground">جارٍ جلب الطقس لموقع «{place}»...</div>
      ) : (
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-black">
              {Math.round(weather.tempMax ?? weather.temp)}°
              {weather.tempMin != null && (
                <span className="mr-2 text-sm font-bold text-muted-foreground">/ {Math.round(weather.tempMin)}°</span>
              )}
            </div>
            <div className="text-xs text-muted-foreground">{weather.label}</div>
          </div>
          <div className="space-y-1 text-left text-xs text-muted-foreground">
            {weather.sunrise && (
              <div className="flex items-center justify-end gap-1.5">
                <Sunrise size={13} className="text-amber" /> الشروق {weather.sunrise}
              </div>
            )}
            {weather.sunset && (
              <div className="flex items-center justify-end gap-1.5">
                <Sunset size={13} className="text-amber" /> الغروب {weather.sunset}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ShotList({ projectId, csId, shots }: { projectId: string; csId: string; shots: any[] }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    scene: "",
    description: "",
    shot_size: "",
    movement: "",
    storyboard_url: "",
    notes: "",
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["shots", projectId, csId] });

  const addShot = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("shots").insert({
        project_id: projectId,
        call_sheet_id: csId,
        scene: form.scene.trim() || null,
        description: form.description.trim(),
        shot_size: form.shot_size || null,
        movement: form.movement || null,
        storyboard_url: form.storyboard_url.trim() || null,
        notes: form.notes.trim() || null,
        sort_order: shots.length,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      setForm({ scene: "", description: "", shot_size: "", movement: "", storyboard_url: "", notes: "" });
      setOpen(false);
      toast.success("تمت إضافة اللقطة");
    },
    onError: () => toast.error("تعذر إضافة اللقطة"),
  });

  const toggleShot = useMutation({
    mutationFn: async (shot: any) => {
      const { error } = await supabase.from("shots").update({ is_done: !shot.is_done }).eq("id", shot.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const removeShot = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("shots").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const done = shots.filter((s) => s.is_done).length;

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-bold">
          قائمة اللقطات{" "}
          <span className="text-xs font-normal text-muted-foreground">
            ({done}/{shots.length})
          </span>
        </h2>
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1 rounded-full bg-amber-gradient px-3 py-1.5 text-xs font-bold text-black"
        >
          <Plus size={14} strokeWidth={3} /> لقطة
        </button>
      </div>

      {open && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (form.description.trim()) addShot.mutate();
          }}
          className="glass-card mb-4 space-y-3 rounded-2xl p-4"
        >
          <div className="grid grid-cols-3 gap-2">
            <input
              value={form.scene}
              onChange={(e) => setForm({ ...form, scene: e.target.value })}
              placeholder="مشهد"
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs outline-none"
            />
            <select
              value={form.shot_size}
              onChange={(e) => setForm({ ...form, shot_size: e.target.value })}
              className="rounded-xl border border-white/10 bg-white/5 px-2 py-2 text-xs outline-none"
            >
              <option value="">حجم اللقطة</option>
              {SHOT_SIZES.map((s) => (
                <option key={s} value={s} className="bg-background">
                  {s}
                </option>
              ))}
            </select>
            <select
              value={form.movement}
              onChange={(e) => setForm({ ...form, movement: e.target.value })}
              className="rounded-xl border border-white/10 bg-white/5 px-2 py-2 text-xs outline-none"
            >
              <option value="">الحركة</option>
              {MOVEMENTS.map((m) => (
                <option key={m} value={m} className="bg-background">
                  {m}
                </option>
              ))}
            </select>
          </div>
          <textarea
            required
            autoFocus
            rows={2}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="وصف اللقطة"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm outline-none"
          />
          <input
            value={form.storyboard_url}
            onChange={(e) => setForm({ ...form, storyboard_url: e.target.value })}
            placeholder="رابط صورة اللوحة القصصية (اختياري)"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs outline-none"
          />
          <input
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="ملاحظات (عدسة، إضاءة، صوت...)"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs outline-none"
          />
          <button
            type="submit"
            disabled={addShot.isPending || !form.description.trim()}
            className="w-full rounded-xl bg-amber-gradient py-2.5 font-bold text-black disabled:opacity-50"
          >
            إضافة اللقطة
          </button>
        </form>
      )}

      {shots.length === 0 ? (
        <div className="glass-card rounded-2xl p-8 text-center text-sm text-muted-foreground">
          لا توجد لقطات بعد في هذا اليوم.
        </div>
      ) : (
        <ol className="space-y-3">
          {shots.map((shot, i) => (
            <li key={shot.id} className={`glass-card rounded-2xl p-3 ${shot.is_done ? "opacity-60" : ""}`}>
              <div className="flex gap-3">
                <button
                  onClick={() => toggleShot.mutate(shot)}
                  aria-label="تبديل حالة اللقطة"
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border ${
                    shot.is_done ? "border-amber bg-amber-gradient text-black" : "border-white/20"
                  }`}
                >
                  {shot.is_done && <Check size={14} strokeWidth={3} />}
                </button>

                {shot.storyboard_url ? (
                  <img
                    src={shot.storyboard_url}
                    alt={`لوحة قصصية للقطة ${i + 1}`}
                    loading="lazy"
                    className="h-16 w-24 shrink-0 rounded-lg border border-white/10 object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-24 shrink-0 items-center justify-center rounded-lg border border-dashed border-white/10 text-muted-foreground">
                    <ImageIcon size={16} />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="rounded bg-white/10 px-1.5 py-0.5 font-bold text-amber">#{i + 1}</span>
                    {shot.scene && <span>مشهد {shot.scene}</span>}
                    {shot.shot_size && <span>{shot.shot_size}</span>}
                    {shot.movement && <span>{shot.movement}</span>}
                  </div>
                  <p className={`mt-1 text-sm ${shot.is_done ? "line-through" : ""}`}>{shot.description}</p>
                  {shot.notes && <p className="mt-1 text-[11px] text-muted-foreground">{shot.notes}</p>}
                </div>

                <button
                  onClick={() => removeShot.mutate(shot.id)}
                  className="h-fit rounded-lg p-1.5 text-muted-foreground hover:text-red-400"
                  aria-label="حذف اللقطة"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
