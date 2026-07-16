import { useQuery } from "@tanstack/react-query";
import { activityLogQuery } from "@/lib/queries";
import { History, CheckCircle2, CircleDashed, PlusCircle, PenSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

export function ActivityFeed({ projectId }: { projectId: string }) {
  const { data: logs, isLoading } = useQuery(activityLogQuery(projectId));
  const qc = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("activity-updates")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "activity_log", filter: `project_id=eq.${projectId}` }, () => {
        qc.invalidateQueries({ queryKey: ["activity_log", projectId] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  if (isLoading) return null;

  if (!logs?.length) {
    return (
      <section className="glass-card mb-6 rounded-2xl p-5 border border-dashed border-white/10 flex flex-col items-center justify-center py-8 text-center">
        <History size={32} className="text-white/10 mb-3" />
        <h3 className="text-sm font-bold text-white mb-1">لا توجد نشاطات بعد</h3>
        <p className="text-xs text-muted-foreground">سجل نشاطات الفريق سيظهر هنا تلقائياً عند البدء بالعمل</p>
      </section>
    );
  }

  return (
    <section className="glass-card mb-6 rounded-2xl p-5">
      <div className="mb-4 flex items-center gap-2">
        <History size={18} className="text-amber" />
        <h2 className="text-sm font-bold text-muted-foreground">أحدث النشاطات</h2>
      </div>
      <div className="space-y-4">
        {logs.map((log) => {
          let Icon = CheckCircle2;
          let iconColor = "text-green-500";
          if (log.action_type.includes("إلغاء")) {
            Icon = CircleDashed;
            iconColor = "text-muted-foreground";
          } else if (log.action_type.includes("إضافة")) {
            Icon = PlusCircle;
            iconColor = "text-blue-500";
          } else if (log.action_type.includes("تعديل")) {
            Icon = PenSquare;
            iconColor = "text-amber";
          }

          return (
            <div key={log.id} className="flex items-start gap-3 text-sm">
              <div className={`mt-0.5 rounded-full bg-white/5 p-1 ${iconColor}`}>
                <Icon size={14} />
              </div>
              <div>
                <span className="font-bold text-white">{log.actor_name}</span>{" "}
                <span className="text-muted-foreground">{log.action_type}</span>
                <div className="text-[10px] text-muted-foreground/60 mt-0.5" dir="ltr">
                  {new Date(log.created_at).toLocaleString('en-US', {
                    hour: 'numeric',
                    minute: 'numeric',
                    hour12: true,
                    month: 'short',
                    day: 'numeric'
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
