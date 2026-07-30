import { lazy, Suspense, useEffect, memo, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { Capacitor } from "@capacitor/core";

// Lazy load ALL pages for faster initial bundle
// DriverDashboard is the most common landing page - preload after initial render
const DriverDashboard = lazy(() => import("./pages/DriverDashboard"));
const ShovelDashboard = lazy(() => import("./pages/ShovelDashboard"));
const WorkLogsPage = lazy(() => import("./pages/WorkLogsPage"));
const TimeClockPage = lazy(() => import("./pages/TimeClockPage"));
const Pending = lazy(() => import("./pages/Pending"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const Auth = lazy(() => import("./pages/Auth"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const IndexPage = lazy(() => import("./pages/Index"));
const NotFound = lazy(() => import("./pages/NotFound"));
const RoleBasedRedirect = lazy(() => import("./components/auth/RoleBasedRedirect"));
const AppAuthShell = lazy(async () => {
  const module = await import("./components/auth/AppAuthShell");
  return { default: module.AppAuthShell };
});
const ProtectedAppRoute = lazy(async () => {
  const module = await import("./components/auth/AppAuthShell");
  return { default: module.ProtectedAppRoute };
});
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const AdminDashboardPage = lazy(() => import("./pages/admin/AdminDashboardPage"));
const UsersPage = lazy(() => import("./pages/admin/UsersPage"));
const CustomerOnboardingPage = lazy(() => import("./pages/admin/CustomerOnboardingPage"));
const OrganizationsPage = lazy(() => import("./pages/admin/OrganizationsPage"));
const LeadsPage = lazy(() => import("./pages/admin/LeadsPage"));
const EmployeesPage = lazy(() => import("./pages/admin/EmployeesPage"));
const AccountsPage = lazy(() => import("./pages/admin/AccountsPage"));
const EquipmentPage = lazy(() => import("./pages/admin/EquipmentPage"));
const ReportsPage = lazy(() => import("./pages/admin/ReportsPage"));
const NotificationsPage = lazy(() => import("./pages/admin/NotificationsPage"));
const NotificationTypesPage = lazy(() => import("./pages/admin/NotificationTypesPage"));
const AuditLogPage = lazy(() => import("./pages/admin/AuditLogPage"));
const LiveMapPage = lazy(() => import("./pages/admin/LiveMapPage"));
const DocsPage = lazy(() => import("./pages/DocsPage"));
const Sonner = lazy(async () => {
  const module = await import("@/components/ui/sonner");
  return { default: module.Toaster };
});
const OfflineIndicator = lazy(async () => {
  const module = await import("@/components/pwa/OfflineIndicator");
  return { default: module.OfflineIndicator };
});

// Memoized PageLoader to prevent unnecessary re-renders
const PageLoader = memo(() => (
  <div className="flex min-h-screen items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
));
PageLoader.displayName = 'PageLoader';

const AppRoutes = ({ showDeferredShell }: { showDeferredShell: boolean }) => (
  <BrowserRouter>
    <Suspense fallback={null}>
      <Sonner />
      <OfflineIndicator />
    </Suspense>

    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<IndexPage />} />
        <Route path="/docs" element={<DocsPage />} />

        <Route path="/auth" element={<Auth />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/auth/callback" element={<AuthCallback />} />

        <Route element={<AppAuthShell showDeferredShell={showDeferredShell} />}>
          <Route
            path="/app"
            element={
              <ProtectedAppRoute>
                <RoleBasedRedirect />
              </ProtectedAppRoute>
            }
          />

          <Route
            path="/dashboard"
            element={
              <ProtectedAppRoute allowedRoles={["admin", "manager", "driver", "dispatch_driver", "trucker"]}>
                <DriverDashboard />
              </ProtectedAppRoute>
            }
          />

          <Route
            path="/shovel"
            element={
              <ProtectedAppRoute allowedRoles={["admin", "manager", "shovel_crew"]}>
                <ShovelDashboard />
              </ProtectedAppRoute>
            }
          />

          <Route
            path="/work-logs"
            element={
              <ProtectedAppRoute allowedRoles={["admin", "manager", "work_log_viewer"]}>
                <WorkLogsPage />
              </ProtectedAppRoute>
            }
          />

          <Route
            path="/time-clock"
            element={
              <ProtectedAppRoute allowedRoles={["admin", "manager"]}>
                <TimeClockPage />
              </ProtectedAppRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <ProtectedAppRoute>
                <ProfilePage />
              </ProtectedAppRoute>
            }
          />

          <Route
            path="/settings"
            element={
              <ProtectedAppRoute>
                <SettingsPage />
              </ProtectedAppRoute>
            }
          />

          <Route
            path="/pending"
            element={
              <ProtectedAppRoute>
                <Pending />
              </ProtectedAppRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <ProtectedAppRoute allowedRoles={["admin", "manager"]}>
                <AdminLayout />
              </ProtectedAppRoute>
            }
          >
            <Route index element={<AdminDashboardPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="customer-setup" element={<CustomerOnboardingPage />} />
            <Route path="organizations" element={<OrganizationsPage />} />
            <Route path="leads" element={<LeadsPage />} />
            <Route path="employees" element={<EmployeesPage />} />
            <Route path="accounts" element={<AccountsPage />} />
            <Route path="equipment" element={<EquipmentPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="notification-types" element={<NotificationTypesPage />} />
            <Route path="audit-log" element={<AuditLogPage />} />
            <Route path="map" element={<LiveMapPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  </BrowserRouter>
);

function App() {
  const [showDeferredShell, setShowDeferredShell] = useState(false);

  useEffect(() => {
    const deferId = window.setTimeout(() => {
      setShowDeferredShell(true);
    }, 0);
    
    (async () => {
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

    return () => {
      window.clearTimeout(deferId);
    };
  }, []);

  return <AppRoutes showDeferredShell={showDeferredShell} />;
}

export default App;
