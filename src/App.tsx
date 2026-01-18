import { lazy, Suspense } from "react";
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

// Lazy load route components for code splitting
const DriverDashboard = lazy(() => import("./pages/DriverDashboard"));
const ShovelDashboard = lazy(() => import("./pages/ShovelDashboard"));
const WorkLogsPage = lazy(() => import("./pages/WorkLogsPage"));
const TimeClockPage = lazy(() => import("./pages/TimeClockPage"));
const Pending = lazy(() => import("./pages/Pending"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const UsersPage = lazy(() => import("./pages/admin/UsersPage"));
const EmployeesPage = lazy(() => import("./pages/admin/EmployeesPage"));
const AccountsPage = lazy(() => import("./pages/admin/AccountsPage"));
const EquipmentPage = lazy(() => import("./pages/admin/EquipmentPage"));
const ReportsPage = lazy(() => import("./pages/admin/ReportsPage"));

const queryClient = new QueryClient();

// Loading fallback component
const PageLoader = () => (
  <div className="flex min-h-screen items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <OfflineIndicator />
          <InstallPrompt />
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/" element={<ProtectedRoute><RoleBasedRedirect /></ProtectedRoute>} />
              
              {/* Role-specific dashboards */}
              <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['driver', 'admin', 'manager']}><DriverDashboard /></ProtectedRoute>} />
              <Route path="/shovel" element={<ProtectedRoute allowedRoles={['shovel_crew', 'admin', 'manager']}><ShovelDashboard /></ProtectedRoute>} />
              
              {/* Admin/Manager only pages */}
              <Route path="/work-logs" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><WorkLogsPage /></ProtectedRoute>} />
              <Route path="/time-clock" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><TimeClockPage /></ProtectedRoute>} />
              
              {/* Profile and Settings (all users) */}
              <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />

              <Route path="/pending" element={<ProtectedRoute><Pending /></ProtectedRoute>} />
              
              {/* Admin routes */}
              <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><AdminLayout /></ProtectedRoute>}>
                <Route index element={<Navigate to="/admin/users" replace />} />
                <Route path="users" element={<UsersPage />} />
                <Route path="employees" element={<EmployeesPage />} />
                <Route path="accounts" element={<AccountsPage />} />
                <Route path="equipment" element={<EquipmentPage />} />
                <Route path="reports" element={<ReportsPage />} />
              </Route>
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AuthProvider>
        </TooltipProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
