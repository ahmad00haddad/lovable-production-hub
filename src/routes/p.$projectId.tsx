import { createFileRoute, Outlet, Link, useRouter } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { projectQuery } from "@/lib/queries";
import { AuthProvider, useAuth } from "@/components/AuthProvider";
import { Settings, UserCircle } from "lucide-react";

export const Route = createFileRoute("/p/$projectId")({
  loader: ({ context, params }) => {
    context.queryClient.ensureQueryData(projectQuery(params.projectId));
  },
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

  return (
    <div className="flex flex-col min-h-dvh">
      {!actorId && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center justify-between">
          <div className="text-xs text-amber-600 font-medium">أنت تتصفح كزائر</div>
          <button 
            onClick={openIdentityModal}
            className="text-xs bg-amber-500 text-black px-3 py-1 rounded-full font-bold flex items-center gap-1 hover:opacity-90 active:scale-95 transition"
          >
            <UserCircle size={14} /> حدد هويتك للتفاعل
          </button>
        </div>
      )}
      <Outlet />
      
      {/* Floating Settings Button */}
      <Link 
        to="/p/$projectId/settings" 
        params={{ projectId }}
        className="fixed bottom-20 left-4 z-50 h-12 w-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-lg active:scale-95 transition-transform"
      >
        <Settings size={20} />
      </Link>
    </div>
  );
}
