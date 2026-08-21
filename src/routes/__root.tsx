import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Toaster } from "sonner";
import { Download, X } from "lucide-react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { usePWAInstall } from "../hooks/usePWAInstall";


function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#1a1d24" },
      { title: "متابعة إنتاج بودكاست QRTA" },
      { name: "description", content: "لوحة تنسيق فريق إنتاج بودكاست QRTA — تابع المهام والمعدات لأيام التصوير من 2 إلى 5 آب." },
      { property: "og:title", content: "متابعة إنتاج بودكاست QRTA" },
      { property: "og:description", content: "لوحة تنسيق فريق إنتاج بودكاست QRTA — تابع المهام والمعدات لأيام التصوير من 2 إلى 5 آب." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "متابعة إنتاج بودكاست QRTA" },
      { name: "twitter:description", content: "لوحة تنسيق فريق إنتاج بودكاست QRTA — تابع المهام والمعدات لأيام التصوير من 2 إلى 5 آب." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/cd90b96d-abff-46db-b09f-c171666b2434" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/cd90b96d-abff-46db-b09f-c171666b2434" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;900&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <PWAInstallButton />
      <Toaster position="top-center" theme="dark" richColors />
    </QueryClientProvider>
  );
}

function PWAInstallButton() {
  const { isInstallable, isIOS, install, dismiss } = usePWAInstall();
  const [showIOSHint, setShowIOSHint] = useState(false);

  if (!isInstallable && !isIOS) return null;

  return (
    <div className="fixed bottom-20 left-4 z-50 flex flex-col items-start gap-2">
      {showIOSHint && (
        <div className="max-w-[240px] rounded-xl bg-card p-3 text-xs text-card-foreground shadow-lg border border-border">
          <p className="mb-1 font-medium">لتثبيت التطبيق على iPhone:</p>
          <p>اضغط <span className="font-bold">Share</span> ثم <span className="font-bold">Add to Home Screen</span>.</p>
          <button
            onClick={() => setShowIOSHint(false)}
            className="mt-2 text-xs text-muted-foreground hover:text-foreground underline"
          >
            فهمت
          </button>
        </div>
      )}

      <button
        onClick={() => {
          if (isInstallable) {
            install();
          } else if (isIOS) {
            setShowIOSHint(true);
          }
        }}
        className="group flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow-lg transition hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
        aria-label="تثبيت التطبيق"
      >
        <Download size={18} strokeWidth={2.5} />
        <span>تثبيت التطبيق</span>
      </button>

      {isInstallable && (
        <button
          onClick={dismiss}
          className="absolute -top-1 -left-1 flex h-5 w-5 items-center justify-center rounded-full bg-muted text-muted-foreground hover:text-foreground"
          aria-label="إخفاء زر التثبيت"
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
}

