import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

function LandingPage() {
  const navigate = useNavigate();
  const [projectId, setProjectId] = useState("");
  const [projectName, setProjectName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  const generateShortCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed similar looking chars (I,1,O,0)
    let result = "";
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = projectId.trim();
    if (!code) return;
    
    setIsJoining(true);
    try {
      // Check if it's a UUID (length 36 usually)
      if (code.length >= 32) {
        navigate({ to: "/p/$projectId", params: { projectId: code } });
        return;
      }

      // Check if it's a short code (around 6 chars)
      const { data, error } = await supabase
        .from("projects")
        .select("id")
        .eq("short_code", code.toUpperCase())
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        toast.error("الكود غير صحيح أو المشروع غير موجود");
        return;
      }

      navigate({ to: "/p/$projectId", params: { projectId: data.id } });
    } catch (err: any) {
      toast.error("حدث خطأ أثناء الانضمام");
      console.error(err);
    } finally {
      setIsJoining(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) return;

    setIsCreating(true);
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        const shortCode = generateShortCode();
        const { data, error } = await supabase
          .from("projects")
          .insert({
            name: projectName,
            short_code: shortCode,
            start_date: startDate || null,
            end_date: endDate || null
          })
          .select()
          .single();

        if (error) {
          if (error.code === '23505') { // Unique violation
            attempts++;
            continue;
          }
          throw error;
        }
        
        toast.success("تم إنشاء المشروع بنجاح!");
        navigate({ to: "/p/$projectId/settings", params: { projectId: data.id } });
        return;
      } catch (err: any) {
        toast.error("حدث خطأ أثناء الإنشاء");
        console.error(err);
        break;
      }
    }
    
    if (attempts >= maxAttempts) {
      toast.error("تعذر توليد كود فريد، يرجى المحاولة مجدداً.");
    }
    setIsCreating(false);
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-10">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-black mb-3">منصة <span className="text-amber">الإنتاج</span></h1>
        <p className="text-muted-foreground text-sm">قم بإدارة طاقمك، مهامك، ومعداتك لمشاريع التصوير بكل سهولة.</p>
      </div>

      <div className="space-y-8">
        <section className="glass-card p-6 rounded-2xl">
          <h2 className="text-lg font-bold mb-4">الدخول لمشروع حالي</h2>
          <form onSubmit={handleJoin} className="flex gap-2">
            <input
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              placeholder="أدخل الكود القصير (أو الكود الطويل)..."
              className="flex-1 rounded-xl bg-white/5 border border-white/10 px-4 py-2 outline-none text-sm font-mono"
            />
            <button disabled={isJoining} type="submit" className="bg-white/10 rounded-xl p-2 px-4 hover:bg-white/20 transition flex items-center gap-2 disabled:opacity-50">
              دخول <ArrowLeft size={16} />
            </button>
          </form>
        </section>

        <div className="flex items-center gap-4 text-muted-foreground text-sm before:h-px before:flex-1 before:bg-white/10 after:h-px after:flex-1 after:bg-white/10">
          أو
        </div>

        <section className="glass-card p-6 rounded-2xl border border-amber/20">
          <h2 className="text-lg font-bold text-amber mb-4">إنشاء مشروع جديد</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">اسم المشروع</label>
              <input
                required
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="مثال: بودكاست، إعلان سيارة..."
                className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2 outline-none text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">تاريخ البداية (اختياري)</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2 outline-none text-sm [color-scheme:dark]"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">تاريخ النهاية (اختياري)</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2 outline-none text-sm [color-scheme:dark]"
                />
              </div>
            </div>
            <button 
              type="submit" 
              disabled={isCreating || !projectName.trim()}
              className="w-full bg-amber-gradient text-black font-bold rounded-xl py-3 mt-2 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Plus size={18} strokeWidth={2.5} />
              بدء المشروع
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
