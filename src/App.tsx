import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import DriverDashboard from "./pages/DriverDashboard";
import ShovelDashboard from "./pages/ShovelDashboard";
import Pending from "./pages/Pending";
import NotFound from "./pages/NotFound";
import AdminLayout from "./pages/admin/AdminLayout";
import UsersPage from "./pages/admin/UsersPage";
import EmployeesPage from "./pages/admin/EmployeesPage";
import AccountsPage from "./pages/admin/AccountsPage";
import EquipmentPage from "./pages/admin/EquipmentPage";
import ReportsPage from "./pages/admin/ReportsPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/driver" element={<ProtectedRoute allowedRoles={['driver', 'admin', 'manager']}><DriverDashboard /></ProtectedRoute>} />
            <Route path="/shovel" element={<ProtectedRoute allowedRoles={['shovel_crew', 'admin', 'manager']}><ShovelDashboard /></ProtectedRoute>} />
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
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;