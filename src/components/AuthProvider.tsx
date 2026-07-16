import { createContext, useContext, useEffect, useState } from "react";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { teamQuery } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

type AuthContextType = {
  actorId: string | null;
  actorName: string | null;
  setActor: (id: string, name: string) => void;
  openIdentityModal: () => void;
};

const AuthContext = createContext<AuthContextType>({
  actorId: null,
  actorName: null,
  setActor: () => {},
  openIdentityModal: () => {},
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
  const [newRole, setNewRole] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    const savedId = localStorage.getItem(`qrta_actor_id_${projectId}`);
    const savedName = localStorage.getItem(`qrta_actor_name_${projectId}`);
    
    if (savedId && savedName) {
      setActorId(savedId);
      setActorName(savedName);
    }
  }, [projectId]);

  const handleSetActor = (id: string, name: string) => {
    localStorage.setItem(`qrta_actor_id_${projectId}`, id);
    localStorage.setItem(`qrta_actor_name_${projectId}`, name);
    setActorId(id);
    setActorName(name);
    setOpen(false);
  };

  const handleCreateMember = async (e: React.FormEvent, defaultRole?: string) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase
        .from("team_members")
        .insert({
          project_id: projectId,
          name: newName,
          role: defaultRole || newRole || "عضو فريق"
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
    <AuthContext.Provider value={{ actorId, actorName, setActor: handleSetActor, openIdentityModal: () => setOpen(true) }}>
      {children}
      <Dialog open={open} onOpenChange={(val) => {
        setOpen(val);
      }}>
        <DialogContent className="max-w-[90vw] w-full sm:max-w-md rounded-2xl p-6 bg-background/95 backdrop-blur-xl border-white/10">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl font-black text-amber">من أنت؟</DialogTitle>
            <DialogDescription className="text-center mt-2">
              {team.length === 0 
                ? "يبدو أن هذا المشروع جديد! أدخل اسمك كمدير للمشروع للبدء." 
                : "يرجى اختيار هويتك من طاقم العمل لتسجيل تحركاتك في النظام."}
            </DialogDescription>
          </DialogHeader>
          
          {team.length === 0 ? (
            <form onSubmit={(e) => handleCreateMember(e, "مدير المشروع")} className="mt-6 flex flex-col gap-3">
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
            <>
              <div className="mt-4 grid grid-cols-2 gap-3 max-h-[40vh] overflow-y-auto pr-1">
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

              {!showAddForm ? (
                <button 
                  onClick={() => setShowAddForm(true)}
                  className="mt-6 w-full rounded-xl border border-dashed border-white/20 p-3 text-sm text-muted-foreground hover:bg-white/5 transition"
                >
                  + لست في القائمة؟ أضف نفسك كعضو جديد
                </button>
              ) : (
                <form onSubmit={(e) => handleCreateMember(e)} className="mt-6 flex flex-col gap-3 pt-4 border-t border-white/10">
                  <h3 className="text-xs font-bold text-amber">إضافة عضو جديد</h3>
                  <input
                    autoFocus
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="اسمك (مثال: سارة)"
                    className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2 outline-none text-sm"
                  />
                  <input
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    placeholder="المسمى الوظيفي (مثال: مصور)"
                    className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2 outline-none text-sm"
                  />
                  <button 
                    type="submit"
                    disabled={!newName.trim() || isSubmitting}
                    className="w-full bg-amber-gradient text-black font-bold rounded-xl py-2 mt-1 disabled:opacity-50 text-sm"
                  >
                    إضافة ودخول
                  </button>
                </form>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </AuthContext.Provider>
  );
}
