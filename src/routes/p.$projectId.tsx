import { createFileRoute, Outlet, Link, useRouter, useMatch } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { projectQuery } from "@/lib/queries";
import { AuthProvider, useAuth } from "@/components/AuthProvider";
import { Settings, UserCircle, Home, Package, CheckSquare } from "lucide-react";

export const Route = createFileRoute("/p/$projectId")({
  loader: ({ context, params }) => {
    context.queryClient.ensureQueryData(projectQuery(params.projectId));
  },
  pendingComponent: () => (
    <div className="flex h-dvh items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
    </div>
  ),
  component: ProjectLayout,
});

function ProjectLayout() {
  const { projectId } = Route.useParams();
  
  return (
    <AuthProvider projectId={projectId}>
      <ProjectLayoutInner />
    </AuthProvider>
  );
}

function ProjectLayoutInner() {
  const { projectId } = Route.useParams();
  const { actorId, openIdentityModal } = useAuth();
  const router = useRouter();
  const currentPath = router.state.location.pathname;

  const isTasks = currentPath.includes('/member/') || currentPath.endsWith('/tasks');
  const isEquipment = currentPath.endsWith('/equipment');
  const isSettings = currentPath.endsWith('/settings');
  const isHome = !isTasks && !isEquipment && !isSettings;

  return (
    <div className="flex flex-col min-h-dvh bg-background pb-16">
      {!actorId && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center justify-between shrink-0">
          <div className="text-xs text-amber-600 font-medium">أنت تتصفح كزائر</div>
          <button 
            onClick={openIdentityModal}
            className="text-xs bg-amber-500 text-black px-3 py-1 rounded-full font-bold flex items-center gap-1 hover:opacity-90 active:scale-95 transition"
          >
            <UserCircle size={14} /> حدد هويتك للتفاعل
          </button>
        </div>
      )}
      <div className="flex-1 overflow-y-auto">
        <Outlet />
      </div>
      
      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-t border-white/10 pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around px-2 py-2">
          <Link
            to="/p/$projectId"
            params={{ projectId }}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors min-w-[64px] ${isHome ? 'text-amber' : 'text-muted-foreground hover:text-white hover:bg-white/5'}`}
          >
            <Home size={20} strokeWidth={isHome ? 2.5 : 2} />
            <span className="text-[10px] font-bold">الرئيسية</span>
          </Link>
          
          <Link
            to="/p/$projectId/equipment"
            params={{ projectId }}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors min-w-[64px] ${isEquipment ? 'text-amber' : 'text-muted-foreground hover:text-white hover:bg-white/5'}`}
          >
            <Package size={20} strokeWidth={isEquipment ? 2.5 : 2} />
            <span className="text-[10px] font-bold">المعدات</span>
          </Link>

          <Link
            to="/p/$projectId/settings"
            params={{ projectId }}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors min-w-[64px] ${isSettings ? 'text-amber' : 'text-muted-foreground hover:text-white hover:bg-white/5'}`}
          >
            <Settings size={20} strokeWidth={isSettings ? 2.5 : 2} />
            <span className="text-[10px] font-bold">الإعدادات</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
