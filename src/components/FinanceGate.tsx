import { useState, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Lock, ShieldCheck, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { financeGateQuery } from "@/lib/finance-queries";
import { unlockFinance, setFinancePin, lockFinance } from "@/lib/finance.functions";

export function useFinanceLock(projectId: string) {
  const qc = useQueryClient();
  const lock = useServerFn(lockFinance);
  return useMutation({
    mutationFn: () => lock({ data: { projectId } }),
    onSuccess: () => {
      qc.removeQueries({ queryKey: ["finance-overview", projectId] });
      qc.removeQueries({ queryKey: ["finance-quotations", projectId] });
      qc.invalidateQueries({ queryKey: ["finance-gate", projectId] });
      toast.success("تم قفل القسم المالي");
    },
  });
}

export function FinanceGate({ projectId, children }: { projectId: string; children: ReactNode }) {
  const qc = useQueryClient();
  const { data: gate, isLoading } = useQuery(financeGateQuery(projectId));
  const unlockFn = useServerFn(unlockFinance);
  const setPinFn = useServerFn(setFinancePin);
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  const unlock = useMutation({
    mutationFn: () => unlockFn({ data: { projectId, pin } }),
    onSuccess: (res) => {
      if (!res.ok) return toast.error("كلمة السر غير صحيحة");
      setPin("");
      qc.invalidateQueries({ queryKey: ["finance-gate", projectId] });
    },
    onError: () => toast.error("تعذر الفتح"),
  });

  const createPin = useMutation({
    mutationFn: () => setPinFn({ data: { projectId, pin } }),
    onSuccess: (res) => {
      if (!res.ok) return toast.error("كلمة السر قصيرة جداً (4 خانات على الأقل)");
      setPin("");
      setConfirmPin("");
      qc.invalidateQueries({ queryKey: ["finance-gate", projectId] });
      toast.success("تم تفعيل الحماية");
    },
    onError: () => toast.error("تعذر الحفظ"),
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
      </div>
    );
  }

  if (gate?.unlocked) return <>{children}</>;

  const input =
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
              className={`${input} mt-5`}
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
              className={`${input} mt-5`}
            />
            <input
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value)}
              type="password"
              inputMode="numeric"
              placeholder="تأكيد كلمة السر"
              className={`${input} mt-2`}
            />
            <button
              onClick={() =>
                pin.length < 4
                  ? toast.error("4 خانات على الأقل")
                  : pin !== confirmPin
                    ? toast.error("كلمتا السر غير متطابقتين")
                    : createPin.mutate()
              }
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
