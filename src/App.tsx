import { lazy, Suspense, useEffect, memo } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { OfflineIndicator } from "@/components/pwa/OfflineIndicator";
import { OfflineSyncIndicator } from "@/components/pwa/OfflineSyncIndicator";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import RoleBasedRedirect from "./components/auth/RoleBasedRedirect";
import { LocationBootstrap } from "@/components/LocationBootstrap";
import { IosInputFocusFix } from "@/components/ios/IosInputFocusFix";
import { Capacitor } from "@capacitor/core";
import AuthCallback from "./pages/AuthCallback";
import { PostLoginNotificationPrompt } from "@/components/notifications/PostLoginNotificationPrompt";
import { NotificationActionHandler } from "@/components/notifications/NotificationActionHandler";
import { AppVersionCheck } from "@/components/ios/AppVersionCheck";

// Lazy load ALL pages for faster initial bundle
// DriverDashboard is the most common landing page - preload after initial render
const DriverDashboard = lazy(() => import("./pages/DriverDashboard"));
const ShovelDashboard = lazy(() => import("./pages/ShovelDashboard"));
const TruckerDashboard = lazy(() => import("./pages/TruckerDashboard"));
const WorkLogsPage = lazy(() => import("./pages/WorkLogsPage"));
const TimeClockPage = lazy(() => import("./pages/TimeClockPage"));
const Pending = lazy(() => import("./pages/Pending"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const UsersPage = lazy(() => import("./pages/admin/UsersPage"));
const EmployeesPage = lazy(() => import("./pages/admin/EmployeesPage"));
const AccountsPage = lazy(() => import("./pages/admin/AccountsPage"));
const EquipmentPage = lazy(() => import("./pages/admin/EquipmentPage"));
const ReportsPage = lazy(() => import("./pages/admin/ReportsPage"));
const NotificationsPage = lazy(() => import("./pages/admin/NotificationsPage"));
const NotificationTypesPage = lazy(() => import("./pages/admin/NotificationTypesPage"));
const AuditLogPage = lazy(() => import("./pages/admin/AuditLogPage"));
const DocsPage = lazy(() => import("./pages/DocsPage"));

// Preload common routes after initial render for smoother navigation
const preloadCommonRoutes = () => {
  // Use requestIdleCallback for non-blocking preload
  const idleCallback = 'requestIdleCallback' in window 
    ? window.requestIdleCallback 
    : (cb: () => void) => setTimeout(cb, 200);
  
  idleCallback(() => {
    // Preload DriverDashboard (most common destination after login)
    import("./pages/DriverDashboard");
    // Preload ShovelDashboard (second most common)
    import("./pages/ShovelDashboard");
  });
};

// Optimized QueryClient with iOS-specific settings
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Reduce refetching on iOS to save battery and network
      staleTime: 1000 * 60 * 2, // 2 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      // Don't refetch on window focus on mobile (saves battery)
      refetchOnWindowFocus: !Capacitor.isNativePlatform(),
      // Prevent refetching when reconnecting on mobile
      refetchOnReconnect: !Capacitor.isNativePlatform(),
    },
  },
});

// Memoized PageLoader to prevent unnecessary re-renders
const PageLoader = memo(() => (
  <div className="flex min-h-screen items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
));
PageLoader.displayName = 'PageLoader';

const AppRoutes = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <TooltipProvider>
        <AuthProvider>
          
          {/* Location and input helpers - enabled on all platforms */}
          <LocationBootstrap />
          <IosInputFocusFix />

          <Toaster />
          <Sonner />
          <OfflineIndicator />
          <OfflineSyncIndicator className="fixed bottom-20 left-4 z-40" />
          <InstallPrompt />
          <PostLoginNotificationPrompt />
          <NotificationActionHandler />

          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <RoleBasedRedirect />
                  </ProtectedRoute>
                }
              />
              <Route path="/auth/callback" element={<AuthCallback />} />

              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute allowedRoles={["driver", "admin", "manager"]}>
                    <DriverDashboard />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/shovel"
                element={
                  <ProtectedRoute allowedRoles={["shovel_crew", "admin", "manager"]}>
                    <ShovelDashboard />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/trucker"
                element={
                  <ProtectedRoute allowedRoles={["trucker", "admin", "manager"]}>
                    <TruckerDashboard />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/work-logs"
                element={
                  <ProtectedRoute allowedRoles={["admin", "manager", "work_log_viewer"]}>
                    <WorkLogsPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/time-clock"
                element={
                  <ProtectedRoute allowedRoles={["admin", "manager"]}>
                    <TimeClockPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <ProfilePage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <SettingsPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/pending"
                element={
                  <ProtectedRoute>
                    <Pending />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={["admin", "manager"]}>
                    <AdminLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/admin/users" replace />} />
                <Route path="users" element={<UsersPage />} />
                <Route path="employees" element={<EmployeesPage />} />
                <Route path="accounts" element={<AccountsPage />} />
                <Route path="equipment" element={<EquipmentPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="notifications" element={<NotificationsPage />} />
                <Route path="notification-types" element={<NotificationTypesPage />} />
                <Route path="audit-log" element={<AuditLogPage />} />
              </Route>

              <Route path="/docs" element={<DocsPage />} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </TooltipProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

function App() {
  useEffect(() => {
    // Preload common routes after initial render for faster navigation
    preloadCommonRoutes();
    
    (async () => {
      const { Capacitor } = await import("@capacitor/core");
      if (Capacitor.isNativePlatform()) {
        // iOS 18.x stability: Defer deep link initialization to allow WebView to stabilize.
        // We need this for OAuth (Apple/Google Sign-In) to work on iOS.
        // Use a longer delay on iOS to ensure the WebView is fully ready.
        const delay = Capacitor.getPlatform() === "ios" ? 1000 : 500;
        
        setTimeout(async () => {
          try {
            const { initDeepLinkAuth } = await import("./deepLinkAuth");
            await initDeepLinkAuth();
          } catch (e) {
            console.error("[App] initDeepLinkAuth failed:", e);
          }
        }, delay);

        // Unregister service workers on native (they cause issues)
        if ("serviceWorker" in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations();
          await Promise.all(regs.map((r) => r.unregister()));
        }
      }
    })();
  }, []);

  return <AppRoutes />;
}

export default App;
