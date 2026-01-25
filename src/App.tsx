import { lazy, Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { OfflineIndicator } from "@/components/pwa/OfflineIndicator";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import RoleBasedRedirect from "./components/auth/RoleBasedRedirect";
import { LocationBootstrap } from "@/components/LocationBootstrap";
import { IosInputFocusFix } from "@/components/ios/IosInputFocusFix";
import { Capacitor } from "@capacitor/core";
import AuthCallback from "./pages/AuthCallback";
import { PostLoginNotificationPrompt } from "@/components/notifications/PostLoginNotificationPrompt";

// Lazy load pages
import DriverDashboard from "./pages/DriverDashboard";
const ShovelDashboard = lazy(() => import("./pages/ShovelDashboard"));
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

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="flex min-h-screen items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

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
          <InstallPrompt />
          <PostLoginNotificationPrompt />

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
                path="/work-logs"
                element={
                  <ProtectedRoute allowedRoles={["admin", "manager"]}>
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
              </Route>

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
