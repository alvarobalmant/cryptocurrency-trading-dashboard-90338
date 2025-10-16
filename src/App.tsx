import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import "./styles/agenda-fullscreen.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import EmployeeRedirect from "@/components/EmployeeRedirect";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import BarbershopSetup from "./pages/BarbershopSetup";
import BarbershopsManager from "./pages/BarbershopsManager";
import BarbershopSelectorNew from "./pages/BarbershopSelectorNew";
import ModernDashboardLayout from "./components/modern/ModernDashboardLayout";
import DashboardOverviewNew from "./components/modern/DashboardOverviewNew";
import ModernAgenda from "./components/modern/ModernAgenda";
import BarbershopSettings from "./pages/BarbershopSettings";
import BarbershopOperationalPanel from "./pages/BarbershopOperationalPanel";
import BarbershopEmployees from "./pages/BarbershopEmployees";
import BarbershopServices from "./pages/BarbershopServices";
import BarbershopAnalytics from "./pages/BarbershopAnalytics";

import BarbershopSubscriptions from "./pages/BarbershopSubscriptions";
import BarbershopVirtualQueue from "./pages/BarbershopVirtualQueue";
import BarbershopAppointments from "./pages/BarbershopAppointments";
import BarbershopClients from "./pages/BarbershopClients";
import BarbershopWhatsAppIntegration from "./pages/BarbershopWhatsAppIntegration";
import BarbershopProducts from "./pages/BarbershopProducts";
import BarbershopNotifications from "./pages/BarbershopNotifications";
import BarbershopTabs from "./pages/BarbershopTabs";
import BarbershopCommissions from "./pages/BarbershopCommissions";
import BarbershopCommissionPeriods from "./pages/BarbershopCommissionPeriods";
import EmployeeInvite from "./pages/EmployeeInvite";
import EmployeeDashboard from "./pages/EmployeeDashboard";
import EmployeePanel from "./pages/EmployeePanel";
import EmployeePersonalDashboard from "./pages/EmployeePersonalDashboard";
import EmployeePersonalDashboardNew from "./pages/EmployeePersonalDashboardNew";
import BookingEntry from "./pages/BookingEntry";
import BookingCategories from "./pages/BookingCategories";
import BookingServices from "./pages/BookingServices";
import BookingEmployees from "./pages/BookingEmployees";
import BookingSchedule from "./pages/BookingSchedule";
import BookingConfirm from "./pages/BookingConfirm";
import TestBooking from "./pages/TestBooking";
import ClientArea from "./pages/ClientArea";
import VirtualQueuePublic from "./pages/VirtualQueuePublic";
import EmployeeProtectedRoute from "./components/EmployeeProtectedRoute";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <EmployeeRedirect />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              
              {/* Protected Routes */}
              <Route path="/setup" element={
                <ProtectedRoute>
                  <BarbershopSetup />
                </ProtectedRoute>
              } />
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/barbershops" element={
                <ProtectedRoute>
                  <BarbershopSelectorNew />
                </ProtectedRoute>
              } />
              
              {/* New Modern Dashboard Layout */}
              <Route path="/barbershop/:barbershopId" element={
                <ProtectedRoute>
                  <ModernDashboardLayout />
                </ProtectedRoute>
              }>
                <Route path="overview" element={<DashboardOverviewNew />} />
                <Route path="employees" element={<BarbershopEmployees />} />
                <Route path="services" element={<BarbershopServices />} />
                <Route path="clients" element={<BarbershopClients />} />
                <Route path="analytics" element={<BarbershopAnalytics />} />
                <Route path="virtual-queue" element={<BarbershopVirtualQueue />} />
                <Route path="products" element={<BarbershopProducts />} />
                
                <Route path="subscriptions" element={<BarbershopSubscriptions />} />
                <Route path="appointments" element={<BarbershopAppointments />} />
                <Route path="operational" element={<BarbershopOperationalPanel />} />
                <Route path="tabs" element={<BarbershopTabs />} />
                <Route path="agenda" element={<ModernAgenda />} />
                <Route path="settings" element={<BarbershopSettings />} />
                <Route path="notifications" element={<BarbershopNotifications />} />
                <Route path="commissions" element={<BarbershopCommissions />} />
                <Route path="commissions-periods" element={<BarbershopCommissionPeriods />} />
                <Route path="whatsapp" element={<BarbershopWhatsAppIntegration />} />
              </Route>
              
              {/* Legacy routes - redirect to new structure */}
              
              {/* Legacy Routes (Protected) */}
              <Route path="/employees" element={
                <ProtectedRoute>
                  <BarbershopEmployees />
                </ProtectedRoute>
              } />
              <Route path="/services" element={
                <ProtectedRoute>
                  <BarbershopServices />
                </ProtectedRoute>
              } />
              <Route path="/analytics" element={
                <ProtectedRoute>
                  <BarbershopAnalytics />
                </ProtectedRoute>
              } />
              
              {/* Employee Routes */}
              <Route path="/:barbershopSlug/employee/invite/:token" element={<EmployeeInvite />} />
              <Route path="/:barbershopSlug/employee" element={<EmployeeDashboard />} />
              <Route path="/employee" element={
                <EmployeeProtectedRoute>
                  <EmployeePanel />
                </EmployeeProtectedRoute>
              } />
              <Route path="/employees/:employeeSlug" element={
                <EmployeeProtectedRoute>
                  <EmployeePersonalDashboardNew />
                </EmployeeProtectedRoute>
              } />
              
              {/* Client Area */}
              <Route path="/cliente" element={
                <ProtectedRoute>
                  <ClientArea />
                </ProtectedRoute>
              } />
              
              {/* Public Booking Routes (NOT protected) */}
              <Route path="/booking/:barbershopSlug" element={<BookingEntry />} />
              <Route path="/booking/:barbershopSlug/categories" element={<BookingCategories />} />
              <Route path="/booking/:barbershopSlug/services" element={<BookingServices />} />
              <Route path="/booking/:barbershopSlug/employees" element={<BookingEmployees />} />
              <Route path="/booking/:barbershopSlug/schedule" element={<BookingSchedule />} />
              <Route path="/booking/:barbershopSlug/confirm" element={<BookingConfirm />} />
              
              {/* Test route for debugging */}
              <Route path="/test-booking/:barbershopSlug" element={<TestBooking />} />
              
              {/* Virtual Queue Public Route */}
              <Route path="/queue/:barbershopSlug" element={<VirtualQueuePublic />} />
              
              {/* Catch-all route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
