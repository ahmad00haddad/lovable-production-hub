import { createFileRoute, Link, useParams, useRouter } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { teamQuery, tasksQuery, equipmentQuery, projectQuery } from "@/lib/queries";
import { ProgressRing } from "@/components/ProgressRing";
import { ActivityFeed } from "@/components/ActivityFeed";
import { Camera, Mic, Video, ClipboardList, Package, ChevronLeft, Clock, Users } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";

export const Route = createFileRoute("/p/$projectId/")({
  loader: ({ context, params }) => {
    context.queryClient.ensureQueryData(projectQuery(params.projectId));
    context.queryClient.ensureQueryData(teamQuery(params.projectId));
    context.queryClient.ensureQueryData(tasksQuery(params.projectId));
    context.queryClient.ensureQueryData(equipmentQuery(params.projectId));
  },
  pendingComponent: () => (
    <div className="flex h-64 items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
    </div>
  ),
  component: Home,
});

const roleIcon = (role: string) => {
  if (role.includes("صوت")) return Mic;
  if (role.includes("منتج") && role.includes("عام")) return ClipboardList;
  if (role.includes("إضاءة") || role.includes("كاميرا")) return Video;
  return Camera;
};

function Countdown({ targetDateString }: { targetDateString?: string | null }) {
  if (!targetDateString) return null;
  const targetDate = new Date(`${targetDateString}T00:00:00`).getTime();
  const now = new Date().getTime();
  const diff = targetDate - now;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days < 0) return null;
  
  return (
    <div className="mb-6 flex items-center justify-between rounded-2xl bg-amber-gradient p-4 text-black shadow-lg">
      <div>
        <div className="text-xs font-bold opacity-80">العد التنازلي للمشروع</div>
        <div className="text-xl font-black">{days} يوماً متبقياً</div>
      </div>
      <Clock size={32} className="opacity-80" />
    </div>
  );
}

function Home() {
  const { projectId } = Route.useParams();
  const router = useRouter();
  const qc = useQueryClient();
  const { data: project } = useSuspenseQuery(projectQuery(projectId));
  const { data: team } = useSuspenseQuery(teamQuery(projectId));
  const { data: tasks } = useSuspenseQuery(tasksQuery(projectId));
  const { data: equipment } = useSuspenseQuery(equipmentQuery(projectId));
  const { openIdentityModal } = useAuth();

  const overallTasks = tasks.length
    ? (tasks.filter((t) => t.is_completed).length / tasks.length) * 100
    : 0;
  const overallGear = equipment.length
    ? (equipment.filter((e) => e.is_secured).length / equipment.length) * 100
    : 0;
  const overall = (overallTasks + overallGear) / 2;

  const createGeneralMember = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.from("team_members").insert({
        project_id: projectId,
        name: "المهام العامة",
        role: "عامة"
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["team_members", projectId] });
      router.navigate({ to: `/p/${projectId}/member/${data.id}` });
    }
  });

  const generalMember = team.find(m => m.name === "المهام العامة" || m.role === "عامة" || m.role === "مشترك");
  const regularTeam = team.filter(m => m.id !== generalMember?.id);

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pb-24 pt-10">
      <header className="mb-8 text-center">
        {project.start_date && project.end_date && (
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-[11px] font-medium tracking-wide text-amber">
            فترة المشروع · {new Date(project.start_date).toLocaleDateString('en-CA')} إلى {new Date(project.end_date).toLocaleDateString('en-CA')}
          </div>
        )}
        <h1 className="text-3xl font-black leading-tight tracking-tight">
          متابعة إنتاج
          <br />
          <span className="text-amber">{project.name}</span>
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          تابع تجهيزات ومهام فريق الإنتاج.
        </p>
      </header>
      
      <Countdown targetDateString={project.start_date} />

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

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-bold text-muted-foreground">فريق العمل والمهام</h2>
        {!generalMember && (
          <button
            onClick={() => createGeneralMember.mutate()}
            disabled={createGeneralMember.isPending}
            className="text-[10px] bg-white/5 border border-white/10 px-2 py-1 rounded hover:bg-white/10 transition flex items-center gap-1"
          >
            <Users size={12} /> إضافة مهام عامة
          </button>
        )}
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3">
        {generalMember && (() => {
          const m = generalMember;
          const memberTasks = tasks.filter((t) => t.team_member_id === m.id);
          const done = memberTasks.filter((t) => t.is_completed).length;
          const pct = memberTasks.length ? (done / memberTasks.length) * 100 : 0;
          return (
            <Link
              key={m.id}
              to="/p/$projectId/member/$id"
              params={{ projectId, id: m.id }}
              className="col-span-2 glass-card group relative overflow-hidden rounded-2xl p-4 transition-transform active:scale-[0.97] border-amber-500/20"
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
                  <ClipboardList size={18} />
                </div>
                <ProgressRing value={pct} size={40} />
              </div>
              <div className="text-base font-bold text-amber-500">{m.name}</div>
              <div className="mt-0.5 line-clamp-2 min-h-[1.5rem] text-[11px] leading-snug text-muted-foreground">
                مهام مشتركة لا تخص شخصاً محدداً
              </div>
              <div className="mt-2 text-[10px] tabular-nums text-amber">
                {done}/{memberTasks.length} مهمة
              </div>
            </Link>
          );
        })()}

        {regularTeam.map((m) => {
          const memberTasks = tasks.filter((t) => t.team_member_id === m.id);
          const done = memberTasks.filter((t) => t.is_completed).length;
          const pct = memberTasks.length ? (done / memberTasks.length) * 100 : 0;
          const Icon = roleIcon(m.role);
          return (
            <Link
              key={m.id}
              to="/p/$projectId/member/$id"
              params={{ projectId, id: m.id }}
              className="glass-card group relative overflow-hidden rounded-2xl p-4 transition-transform active:scale-[0.97]"
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-amber-gradient text-black">
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

      <div className="mb-6 flex justify-center">
        <button 
          onClick={openIdentityModal}
          className="text-xs text-amber-500 border border-amber-500/30 rounded-xl px-5 py-2 hover:bg-amber-500/10 transition-colors"
        >
          + لست في القائمة؟ أضف نفسك
        </button>
      </div>
      
      <ActivityFeed projectId={projectId} />

      <Link
        to="/p/$projectId/equipment"
        params={{ projectId }}
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
