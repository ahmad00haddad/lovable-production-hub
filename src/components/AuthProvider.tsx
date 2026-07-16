import { createContext, useContext, useEffect, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { teamQuery } from "@/lib/queries";
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
  const [actorId, setActorId] = useState<string | null>(null);
  const [actorName, setActorName] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

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
              يرجى اختيار هويتك من طاقم العمل لتسجيل تحركاتك في النظام.
            </DialogDescription>
          </DialogHeader>
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
        </DialogContent>
      </Dialog>
    </AuthContext.Provider>
  );
}
