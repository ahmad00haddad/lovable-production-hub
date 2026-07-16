import { createContext, useContext, useEffect, useState } from "react";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { teamQuery } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

type AuthContextType = {
  actorId: string | null;
  actorName: string | null;
  setActor: (id: string, name: string) => void;
};

const AuthContext = createContext<AuthContextType>({
  actorId: null,
  actorName: null,
  setActor: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children, projectId }: { children: React.ReactNode; projectId: string }) {
  const { data: team } = useSuspenseQuery(teamQuery(projectId));
  const qc = useQueryClient();
  const [actorId, setActorId] = useState<string | null>(null);
  const [actorName, setActorName] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const savedId = localStorage.getItem(`qrta_actor_id_${projectId}`);
    const savedName = localStorage.getItem(`qrta_actor_name_${projectId}`);
    
    if (savedId && savedName) {
      setActorId(savedId);
      setActorName(savedName);
    } else {
      setOpen(true);
    }
  }, []);

  const handleSetActor = (id: string, name: string) => {
    localStorage.setItem(`qrta_actor_id_${projectId}`, id);
    localStorage.setItem(`qrta_actor_name_${projectId}`, name);
    setActorId(id);
    setActorName(name);
    setOpen(false);
  };

  const handleCreateFirstMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase
        .from("team_members")
        .insert({
          project_id: projectId,
          name: newName,
          role: "مدير المشروع"
        })
        .select()
        .single();
      
      if (error) throw error;
      
      qc.invalidateQueries({ queryKey: ["team_members", projectId] });
      handleSetActor(data.id, data.name);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthContext.Provider value={{ actorId, actorName, setActor: handleSetActor }}>
      {children}
      <Dialog open={open} onOpenChange={(val) => {
        // Prevent closing by clicking outside if no user selected
        if (!actorId) return;
        setOpen(val);
      }}>
        {/* Added standard styling directly instead of relying solely on hideClose because hideClose doesn't exist on standard shadcn DialogContent by default */}
        <DialogContent className="max-w-[90vw] w-full sm:max-w-md rounded-2xl p-6 bg-background/95 backdrop-blur-xl border-white/10 [&>button]:hidden">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl font-black text-amber">من أنت؟</DialogTitle>
            <DialogDescription className="text-center mt-2">
              {team.length === 0 
                ? "يبدو أن هذا المشروع جديد! أدخل اسمك كمدير للمشروع للبدء." 
                : "يرجى اختيار هويتك من طاقم العمل لتسجيل تحركاتك في النظام."}
            </DialogDescription>
          </DialogHeader>
          
          {team.length === 0 ? (
            <form onSubmit={handleCreateFirstMember} className="mt-6 flex flex-col gap-3">
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="اسمك (مثال: أحمد)"
                className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 outline-none text-sm text-center"
              />
              <button 
                type="submit"
                disabled={!newName.trim() || isSubmitting}
                className="w-full bg-amber text-black font-bold rounded-xl py-3 mt-2 disabled:opacity-50"
              >
                الدخول كمدير مشروع
              </button>
            </form>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-3">
              {team.map((m) => (
                <button
                  key={m.id}
                  onClick={() => handleSetActor(m.id, m.name)}
                  className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-4 transition-transform active:scale-95 hover:bg-white/10"
                >
                  <div className="font-bold">{m.name}</div>
                  <div className="text-[10px] text-muted-foreground text-center line-clamp-2">{m.role}</div>
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AuthContext.Provider>
  );
}
