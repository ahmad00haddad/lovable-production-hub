import { Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { callSheetsQuery } from "@/lib/queries";
import { CalendarDays, MapPin, Clock, ChevronLeft } from "lucide-react";

function dayLabel(dateStr: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(`${dateStr}T00:00:00`);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return "اليوم";
  if (diff === 1) return "غداً";
  return `بعد ${diff} يوم`;
}

export function NextShootCard({ projectId }: { projectId: string }) {
  const { data: sheets } = useSuspenseQuery(callSheetsQuery(projectId));

  const todayStr = new Date().toLocaleDateString("en-CA");
  const next = sheets
    .filter((s) => s.shoot_date && s.shoot_date >= todayStr)
    .sort((a, b) => (a.shoot_date! < b.shoot_date! ? -1 : 1))[0];

  if (!next) return null;

  return (
    <Link
      to="/p/$projectId/callsheet/$csId"
      params={{ projectId, csId: next.id }}
      className="glass-card mb-6 block rounded-2xl border border-amber-500/25 p-5 transition-transform active:scale-[0.98]"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2 text-[11px] font-bold text-amber">
          <CalendarDays size={14} />
          يوم التصوير القادم · {dayLabel(next.shoot_date!)}
        </div>
        <ChevronLeft size={18} className="text-muted-foreground" />
      </div>

      <div className="mt-2 text-lg font-black">{next.title}</div>

      <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1 rounded-lg bg-white/5 px-2 py-1">
          <CalendarDays size={12} /> {next.shoot_date}
        </span>
        {next.call_time && (
          <span className="inline-flex items-center gap-1 rounded-lg bg-white/5 px-2 py-1">
            <Clock size={12} /> الحضور {next.call_time.slice(0, 5)}
          </span>
        )}
        {next.location_name && (
          <span className="inline-flex items-center gap-1 rounded-lg bg-white/5 px-2 py-1">
            <MapPin size={12} /> {next.location_name}
          </span>
        )}
      </div>
    </Link>
  );
}
