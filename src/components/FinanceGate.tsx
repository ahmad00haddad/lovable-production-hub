import { useState, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Lock, ShieldCheck, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const STORAGE_KEY = (pid: string) => `finance-unlocked-${pid}`;

function isUnlocked(projectId: string): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(STORAGE_KEY(projectId)) === "true";
}

/* ------------------------------------------------------------------ */
/* useFinanceLock — call lock.mutate() to re-lock                     */
/* ------------------------------------------------------------------ */

export function useFinanceLock(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      localStorage.removeItem(STORAGE_KEY(projectId));
    },
    onSuccess: () => {
      qc.removeQueries({ queryKey: ["finance-overview", projectId] });
      qc.removeQueries({ queryKey: ["finance-quotations", projectId] });
      qc.invalidateQueries({ queryKey: ["finance-gate", projectId] });
      toast.success("تم قفل القسم المالي");
    },
  });
}

/* ------------------------------------------------------------------ */
/* FinanceGate — fully client-side PIN gate                           */
/* ------------------------------------------------------------------ */

export function FinanceGate({ projectId, children }: { projectId: string; children: ReactNode }) {
  const qc = useQueryClient();
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  // Check if PIN exists in finance_pins table
  const { data: gate, isLoading, error: gateError } = useQuery({
    queryKey: ["finance-gate", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("finance_pins" as any)
        .select("pin")
        .eq("project_id", projectId)
        .maybeSingle();
      if (error) throw error;
      return {
        hasPin: !!data,
        storedPin: (data as any)?.pin as string | null,
        unlocked: !!data && isUnlocked(projectId),
      };
    },
    staleTime: 0,
    retry: 1,
  });

  // Unlock: compare PIN client-side
  const unlock = useMutation({
    mutationFn: async () => {
      if (!gate?.storedPin) throw new Error("no-pin");
      if (pin !== gate.storedPin) throw new Error("wrong");
      localStorage.setItem(STORAGE_KEY(projectId), "true");
    },
    onSuccess: () => {
      setPin("");
      qc.invalidateQueries({ queryKey: ["finance-gate", projectId] });
    },
    onError: (e: Error) => {
      toast.error(e.message === "wrong" ? "كلمة السر غير صحيحة" : "خطأ");
    },
  });

  // Create new PIN
  const createPin = useMutation({
    mutationFn: async () => {
      if (pin.length < 4) throw new Error("short");
      if (pin !== confirmPin) throw new Error("mismatch");
      // Upsert into finance_pins
      const { error } = await supabase
        .from("finance_pins" as any)
        .upsert({ project_id: projectId, pin } as any, { onConflict: "project_id" });
      if (error) throw error;
      localStorage.setItem(STORAGE_KEY(projectId), "true");
    },
    onSuccess: () => {
      setPin("");
      setConfirmPin("");
      qc.invalidateQueries({ queryKey: ["finance-gate", projectId] });
      toast.success("تم تفعيل الحماية");
    },
    onError: (e: Error) => {
      if (e.message === "short") toast.error("4 خانات على الأقل");
      else if (e.message === "mismatch") toast.error("كلمتا السر غير متطابقتين");
      else toast.error(`خطأ: ${e.message}`);
    },
  });

  // Loading
  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
      </div>
    );
  }

  // Error (e.g. table doesn't exist yet)
  if (gateError) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 pb-28 pt-8">
        <div className="glass-card rounded-3xl p-7 text-center">
          <p className="text-sm text-red-400 mb-3">خطأ في تحميل القسم المالي</p>
          <p className="text-xs text-muted-foreground mb-4 direction-ltr" dir="ltr">{String(gateError)}</p>
          <p className="text-xs text-muted-foreground">
            يرجى التأكد من تشغيل SQL الإعداد في Supabase SQL Editor
          </p>
        </div>
      </div>
    );
  }

  // Unlocked → show children
  if (gate?.unlocked) return <>{children}</>;

  const inputClass =
    "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-center text-lg tracking-[0.4em] outline-none focus:border-amber-500/50";

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 pb-28 pt-8">
      <div className="glass-card rounded-3xl p-7 text-center">
        <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-gradient text-black">
          {gate?.hasPin ? <Lock size={28} /> : <ShieldCheck size={28} />}
        </div>

        {gate?.hasPin ? (
          <>
            <h1 className="text-xl font-black">قسم مالي محمي</h1>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              الأسعار والمصاريف والمستحقات يراها المنتج وصاحب العمل فقط.
              أدخل كلمة السر للمتابعة.
            </p>
            <input
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && pin && unlock.mutate()}
              type="password"
              inputMode="numeric"
              placeholder="••••"
              className={`${inputClass} mt-5`}
            />
            <button
              onClick={() => pin && unlock.mutate()}
              disabled={unlock.isPending || !pin}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-gradient py-3 text-sm font-bold text-black disabled:opacity-50"
            >
              <KeyRound size={16} /> فتح القسم
            </button>
          </>
        ) : (
          <>
            <h1 className="text-xl font-black">فعّل حماية القسم المالي</h1>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              ضع كلمة سر خاصة بك. بدونها لن يرى أي شخص من الفريق الأسعار أو المصاريف،
              حتى لو كان معه رابط المشروع.
            </p>
            <input
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              type="password"
              inputMode="numeric"
              placeholder="كلمة السر"
              className={`${inputClass} mt-5`}
            />
            <input
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value)}
              type="password"
              inputMode="numeric"
              placeholder="تأكيد كلمة السر"
              className={`${inputClass} mt-2`}
            />
            <button
              onClick={() => createPin.mutate()}
              disabled={createPin.isPending}
              className="mt-3 w-full rounded-xl bg-amber-gradient py-3 text-sm font-bold text-black disabled:opacity-50"
            >
              تفعيل الحماية
            </button>
          </>
        )}
      </div>
    </div>
  );
}
