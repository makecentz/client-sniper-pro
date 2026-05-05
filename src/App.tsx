import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/DashboardLayout";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import DashboardHome from "./pages/dashboard/DashboardHome";
import SearchPanel from "./pages/dashboard/SearchPanel";
import SavedLeads from "./pages/dashboard/SavedLeads";
import AITools from "./pages/dashboard/AITools";
import DashboardSettings from "./pages/dashboard/DashboardSettings";
import Heatmap from "./pages/dashboard/Heatmap";
import Affiliate from "./pages/dashboard/Affiliate";
import Admin from "./pages/Admin";
import Onboarding from "./pages/Onboarding";
import TermsOfService from "./pages/TermsOfService";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import CustomerSupport from "./pages/CustomerSupport";
import AffiliateProgram from "./pages/AffiliateProgram";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/support" element={<CustomerSupport />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute key="dashboard">
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardHome />} />
              <Route path="search" element={<SearchPanel />} />
              <Route path="leads" element={<SavedLeads />} />
              <Route path="ai-tools" element={<AITools />} />
              <Route path="heatmap" element={<Heatmap />} />
              <Route path="settings" element={<DashboardSettings />} />
            </Route>
            <Route path="/onboarding" element={<ProtectedRoute key="onboarding"><Onboarding /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
