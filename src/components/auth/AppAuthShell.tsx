import { lazy, Suspense, type ReactNode, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import type { AppRole } from "@/types/auth";

const OfflineSyncIndicator = lazy(async () => {
  const module = await import("@/components/pwa/OfflineSyncIndicator");
  return { default: module.OfflineSyncIndicator };
});

const LocationBootstrap = lazy(async () => {
  const module = await import("@/components/LocationBootstrap");
  return { default: module.LocationBootstrap };
});

const IosInputFocusFix = lazy(async () => {
  const module = await import("@/components/ios/IosInputFocusFix");
  return { default: module.IosInputFocusFix };
});

const PostLoginNotificationPrompt = lazy(async () => {
  const module = await import("@/components/notifications/PostLoginNotificationPrompt");
  return { default: module.PostLoginNotificationPrompt };
});

const NotificationActionHandler = lazy(async () => {
  const module = await import("@/components/notifications/NotificationActionHandler");
  return { default: module.NotificationActionHandler };
});

const AppVersionCheck = lazy(async () => {
  const module = await import("@/components/ios/AppVersionCheck");
  return { default: module.AppVersionCheck };
});

// Keep query behavior scoped to authenticated app routes so the public site
// doesn't eagerly pay for app-only data plumbing.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      gcTime: 1000 * 60 * 10,
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      refetchOnWindowFocus: !Capacitor.isNativePlatform(),
      refetchOnReconnect: !Capacitor.isNativePlatform(),
    },
  },
});

function AuthenticatedRoutePreloader() {
  const { user, roles, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading || !user) return;

    const idleCallback = "requestIdleCallback" in window
      ? window.requestIdleCallback
      : (cb: () => void) => window.setTimeout(cb, 200);

    idleCallback(() => {
      if (roles.includes("admin") || roles.includes("manager")) {
        void import("@/pages/admin/AdminLayout");
        void import("@/pages/admin/AdminDashboardPage");
        return;
      }

      if (roles.includes("shovel_crew")) {
        void import("@/pages/ShovelDashboard");
        return;
      }

      if (roles.includes("driver") || roles.includes("dispatch_driver") || roles.includes("trucker")) {
        void import("@/pages/DriverDashboard");
      }
    });
  }, [isLoading, roles, user]);

  return null;
}

export function AppAuthShell({ showDeferredShell }: { showDeferredShell: boolean }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AuthenticatedRoutePreloader />
        {showDeferredShell ? (
          <Suspense fallback={null}>
            <LocationBootstrap />
            <IosInputFocusFix />
            <OfflineSyncIndicator className="fixed bottom-20 left-4 z-40" />
            <PostLoginNotificationPrompt />
            <NotificationActionHandler />
            <AppVersionCheck />
          </Suspense>
        ) : null}
        <Outlet />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export function ProtectedAppRoute({
  allowedRoles,
  children,
  requireAnyRole,
}: {
  allowedRoles?: AppRole[];
  children: ReactNode;
  requireAnyRole?: boolean;
}) {
  return (
    <ProtectedRoute allowedRoles={allowedRoles} requireAnyRole={requireAnyRole}>
      {children}
    </ProtectedRoute>
  );
}
