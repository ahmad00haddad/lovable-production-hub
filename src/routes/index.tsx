import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { teamQuery, tasksQuery, equipmentQuery } from "@/lib/queries";
import { ProgressRing } from "@/components/ProgressRing";
import { Camera, Mic, Video, ClipboardList, Package, ChevronLeft } from "lucide-react";

export const Route = createFileRoute("/")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(teamQuery);
    context.queryClient.ensureQueryData(tasksQuery());
    context.queryClient.ensureQueryData(equipmentQuery);
  },
  component: Home,
});

const roleIcon = (role: string) => {
  if (role.includes("صوت")) return Mic;
  if (role.includes("منتج") && role.includes("عام")) return ClipboardList;
  if (role.includes("إضاءة") || role.includes("كاميرا")) return Video;
  return Camera;
};

function Home() {
  const { data: team } = useSuspenseQuery(teamQuery);
  const { data: tasks } = useSuspenseQuery(tasksQuery());
  const { data: equipment } = useSuspenseQuery(equipmentQuery);

  const overallTasks = tasks.length
    ? (tasks.filter((t) => t.is_completed).length / tasks.length) * 100
    : 0;
  const overallGear = equipment.length
    ? (equipment.filter((e) => e.is_secured).length / equipment.length) * 100
    : 0;
  const overall = (overallTasks + overallGear) / 2;

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pb-24 pt-10">
      <header className="mb-8 text-center">
        <div className="mb-6 overflow-hidden rounded-3xl border border-white/10 shadow-2xl relative aspect-[21/9]">
          <div className="absolute inset-0 bg-gradient-to-t from-slate-deep/80 to-transparent z-10 pointer-events-none"></div>
          <img src="/header-bg.png" alt="Podcast Production Header" className="h-full w-full object-cover opacity-90" />
        </div>
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-[11px] font-medium tracking-wide text-amber">
          فترة التصوير · 2 – 5 آب
        </div>
        <h1 className="text-3xl font-black leading-tight tracking-tight">
          متابعة إنتاج
          <br />
          <span className="text-amber">بودكاست QRTA</span>
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          تابع تجهيزات ومهام فريق الإنتاج قبل أيام التصوير.
        </p>
      </header>

      <section className="glass-card mb-6 rounded-2xl p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground">الجاهزية الكلية للمشروع</div>
            <div className="mt-1 text-2xl font-bold">{Math.round(overall)}%</div>
          </div>
          <ProgressRing value={overall} size={64} />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 text-center">
          <div className="rounded-xl bg-white/5 p-3">
            <div className="text-[11px] text-muted-foreground">المهام</div>
            <div className="mt-0.5 text-lg font-bold tabular-nums">
              {tasks.filter((t) => t.is_completed).length}
              <span className="text-muted-foreground">/{tasks.length}</span>
            </div>
          </div>
          <div className="rounded-xl bg-white/5 p-3">
            <div className="text-[11px] text-muted-foreground">المعدات</div>
            <div className="mt-0.5 text-lg font-bold tabular-nums">
              {equipment.filter((e) => e.is_secured).length}
              <span className="text-muted-foreground">/{equipment.length}</span>
            </div>
          </div>
        </div>
      </section>

      <h2 className="mb-3 text-sm font-bold text-muted-foreground">اختر اسمك للبدء</h2>
      <div className="mb-6 grid grid-cols-2 gap-3">
        {team.map((m) => {
          const memberTasks = tasks.filter((t) => t.team_member_id === m.id);
          const done = memberTasks.filter((t) => t.is_completed).length;
          const pct = memberTasks.length ? (done / memberTasks.length) * 100 : 0;
          const Icon = roleIcon(m.role);
          return (
            <Link
              key={m.id}
              to="/member/$id"
              params={{ id: m.id }}
              className="glass-card group relative overflow-hidden rounded-2xl p-4 transition-transform active:scale-[0.97]"
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-amber-gradient">
                  <Icon size={18} />
                </div>
                <ProgressRing value={pct} size={40} />
              </div>
              <div className="text-base font-bold">{m.name}</div>
              <div className="mt-0.5 line-clamp-2 min-h-[2.5rem] text-[11px] leading-snug text-muted-foreground">
                {m.role}
              </div>
              <div className="mt-2 text-[10px] tabular-nums text-amber">
                {done}/{memberTasks.length} مهمة
              </div>
            </Link>
          );
        })}
      </div>

      <Link
        to="/equipment"
        className="glass-card flex items-center justify-between rounded-2xl p-4 transition-transform active:scale-[0.98]"
      >
        <div className="flex items-center gap-3">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-amber-gradient">
            <Package size={20} />
          </div>
          <div>
            <div className="text-base font-bold">قائمة المعدات المشتركة</div>
            <div className="text-[11px] text-muted-foreground">
              {equipment.filter((e) => e.is_secured).length} من {equipment.length} تم تأمينها
            </div>
          </div>
        </div>
        <ChevronLeft className="text-muted-foreground" size={20} />
      </Link>
    </div>
  );
}
