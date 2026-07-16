import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { projectQuery, teamQuery } from "@/lib/queries";
import { toast } from "sonner";
import { ChevronRight, Save, Plus, Trash2, Copy, Share2 } from "lucide-react";
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

export const Route = createFileRoute("/p/$projectId/settings")({
  loader: ({ context, params }) => {
    context.queryClient.ensureQueryData(projectQuery(params.projectId));
    context.queryClient.ensureQueryData(teamQuery(params.projectId));
  },
  pendingComponent: () => (
    <div className="flex h-64 items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
    </div>
  ),
  component: SettingsPage,
});

function SettingsPage() {
  const { projectId } = Route.useParams();
  const router = useRouter();
  const qc = useQueryClient();
  const { data: project } = useSuspenseQuery(projectQuery(projectId));
  const { data: team } = useSuspenseQuery(teamQuery(projectId));

  const [projectName, setProjectName] = useState(project.name);
  const [startDate, setStartDate] = useState(project.start_date || "");
  const [endDate, setEndDate] = useState(project.end_date || "");
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("");

  const updateProject = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("projects")
        .update({
          name: projectName,
          start_date: startDate || null,
          end_date: endDate || null,
        })
        .eq("id", projectId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project", projectId] });
      toast.success("تم حفظ إعدادات المشروع");
    },
  });

  const addMember = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("team_members").insert({
        project_id: projectId,
        name: newMemberName,
        role: newMemberRole,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewMemberName("");
      setNewMemberRole("");
      qc.invalidateQueries({ queryKey: ["team_members", projectId] });
      toast.success("تم إضافة العضو");
    },
  });

  const deleteMember = useMutation({
    mutationFn: async (id: string) => {
      const { error: tasksError } = await supabase.from("tasks").delete().eq("team_member_id", id);
      if (tasksError) throw tasksError;

      const { error } = await supabase.from("team_members").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["team_members", projectId] });
      qc.invalidateQueries({ queryKey: ["tasks", projectId] });
      toast.success("تم حذف العضو ومهامه");
    },
  });

  const copyLink = () => {
    const url = `${window.location.origin}/p/${projectId}`;
    navigator.clipboard.writeText(`انضم لمشروع الإنتاج الخاص بنا!\nالرابط المباشر: ${url}\n\nأو أدخل الكود القصير يدوياً: ${project.short_code}`);
    toast.success("تم نسخ رسالة الدعوة");
  };

  return (
    <div className="mx-auto min-h-dvh max-w-md px-5 pb-32 pt-6">
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={() => router.history.back()}
          className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-muted-foreground active:scale-95"
        >
          <ChevronRight size={14} />
          رجوع
        </button>
        <h1 className="text-xl font-bold">إعدادات المشروع</h1>
      </div>

      <div className="space-y-6">
        <section className="glass-card p-5 rounded-2xl border border-amber/20 bg-amber/5">
          <h2 className="text-sm font-bold text-amber mb-3 flex items-center gap-2">
            <Share2 size={16} />
            دعوة الفريق
          </h2>
          <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
            انسخ الكود القصير أو الرابط المباشر وأرسله لفريقك ليدخلوا إلى هذه المساحة المشتركة.
          </p>
          <div className="flex gap-2">
            <div className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xl font-black tracking-widest text-white flex justify-center items-center">
              {project.short_code}
            </div>
            <button 
              onClick={copyLink}
              className="bg-amber text-black font-bold px-3 py-2 rounded-xl flex items-center gap-2 text-xs hover:opacity-90 active:scale-95 transition"
            >
              <Copy size={14} /> نسخ
            </button>
          </div>
        </section>

        <section className="glass-card p-5 rounded-2xl">
          <h2 className="text-sm font-bold mb-4">تفاصيل المشروع</h2>
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              updateProject.mutate();
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-xs text-muted-foreground mb-1">اسم المشروع</label>
              <input
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 outline-none text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">تاريخ البداية</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 outline-none text-sm [color-scheme:dark]"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">تاريخ النهاية</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 outline-none text-sm [color-scheme:dark]"
                />
              </div>
            </div>
            <button 
              type="submit" 
              disabled={updateProject.isPending}
              className="w-full bg-white/10 hover:bg-white/20 transition rounded-xl py-2.5 text-sm font-bold flex justify-center items-center gap-2"
            >
              <Save size={16} /> حفظ التفاصيل
            </button>
          </form>
        </section>

        <section className="glass-card p-5 rounded-2xl">
          <h2 className="text-sm font-bold mb-4">أعضاء الفريق</h2>
          
          <ul className="space-y-3 mb-6">
            {team.map(m => (
              <li key={m.id} className="flex items-center justify-between bg-white/5 border border-white/5 rounded-xl p-3">
                <div>
                  <div className="text-sm font-bold">{m.name}</div>
                  <div className="text-xs text-amber mt-0.5">{m.role}</div>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button className="text-muted-foreground hover:text-red-500 p-2 active:scale-95 transition">
                      <Trash2 size={16} />
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="max-w-[90vw] sm:max-w-md rounded-2xl border-white/10 bg-background/95 backdrop-blur-xl p-6">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-right text-lg font-black text-amber">حذف العضو</AlertDialogTitle>
                      <AlertDialogDescription className="text-right text-sm leading-relaxed text-muted-foreground">
                        هل أنت متأكد من حذف <span className="font-bold text-white">{m.name}</span>؟ سيؤدي هذا الإجراء أيضاً إلى حذف كافة المهام المرتبطة به بشكل نهائي.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex items-center gap-2 mt-4 sm:justify-end">
                      <AlertDialogCancel className="w-full sm:w-auto mt-0 border-white/10 bg-white/5 hover:bg-white/10 hover:text-white rounded-xl">
                        إلغاء
                      </AlertDialogCancel>
                      <AlertDialogAction 
                        className="w-full sm:w-auto bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white rounded-xl transition"
                        onClick={() => deleteMember.mutate(m.id)}
                      >
                        نعم، احذف العضو
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </li>
            ))}
          </ul>

          <form 
            onSubmit={(e) => {
              e.preventDefault();
              if (newMemberName && newMemberRole) addMember.mutate();
            }}
            className="space-y-3 border-t border-white/10 pt-4"
          >
            <h3 className="text-xs text-muted-foreground font-bold">إضافة عضو جديد</h3>
            <input
              required
              placeholder="الاسم (مثال: أحمد)"
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
              className="w-full rounded-xl bg-black/20 border border-white/10 px-3 py-2 outline-none text-sm"
            />
            <input
              required
              placeholder="الدور (مثال: مدير تصوير)"
              value={newMemberRole}
              onChange={(e) => setNewMemberRole(e.target.value)}
              className="w-full rounded-xl bg-black/20 border border-white/10 px-3 py-2 outline-none text-sm"
            />
            <button 
              type="submit"
              disabled={!newMemberName || !newMemberRole || addMember.isPending}
              className="w-full bg-amber-gradient text-black font-bold rounded-xl py-2 flex justify-center items-center gap-2 disabled:opacity-50"
            >
              <Plus size={16} strokeWidth={3} /> إضافة
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
