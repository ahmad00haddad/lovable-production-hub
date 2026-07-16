import { createFileRoute, Outlet, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { projectQuery } from "@/lib/queries";
import { AuthProvider } from "@/components/AuthProvider";
import { Settings } from "lucide-react";

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
      <Outlet />
      
      {/* Floating Settings Button */}
      <Link 
        to="/p/$projectId/settings" 
        params={{ projectId }}
        className="fixed bottom-20 left-4 z-50 h-12 w-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-lg active:scale-95 transition-transform"
      >
        <Settings size={20} />
      </Link>
    </AuthProvider>
  );
}
