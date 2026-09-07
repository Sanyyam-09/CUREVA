import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import FloatingSOSButton from "@/components/FloatingSOSButton";
import AIChatbot from "@/components/AIChatbot";
import PageTransition from "@/components/PageTransition";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import DoctorSearch from "./pages/DoctorSearch";
import HospitalPricing from "./pages/HospitalPricing";
import GovernmentSchemes from "./pages/GovernmentSchemes";
import SymptomChecker from "./pages/SymptomChecker";
import VideoConsultation from "./pages/VideoConsultation";
import MedicalRecords from "./pages/MedicalRecords";
import Pharmacy from "./pages/Pharmacy";
import LabTests from "./pages/LabTests";
import EmergencySOS from "./pages/EmergencySOS";
import HealthAwareness from "./pages/HealthAwareness";
import BookAppointment from "./pages/BookAppointment";
import DoctorRegister from "./pages/DoctorRegister";
import DoctorDashboard from "./pages/DoctorDashboard";
import PatientProfile from "./pages/PatientProfile";
import PatientRecord from "./pages/PatientRecord";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition><Landing /></PageTransition>} />
        <Route path="/login" element={<PageTransition><Login /></PageTransition>} />
        <Route path="/register" element={<PageTransition><Register /></PageTransition>} />
        <Route path="/forgot-password" element={<PageTransition><ForgotPassword /></PageTransition>} />
        <Route path="/reset-password" element={<PageTransition><ResetPassword /></PageTransition>} />
        <Route path="/admin-login" element={<PageTransition><AdminLogin /></PageTransition>} />
        <Route path="/admin" element={<PageTransition><AdminDashboard /></PageTransition>} />
        <Route path="/home" element={<PageTransition><Index /></PageTransition>} />
        <Route path="/dashboard" element={<PageTransition><Dashboard /></PageTransition>} />
        <Route path="/dashboard/*" element={<PageTransition><Dashboard /></PageTransition>} />
        <Route path="/doctors" element={<PageTransition><DoctorSearch /></PageTransition>} />
        <Route path="/hospital-pricing" element={<PageTransition><HospitalPricing /></PageTransition>} />
        <Route path="/government-schemes" element={<PageTransition><GovernmentSchemes /></PageTransition>} />
        <Route path="/symptom-checker" element={<PageTransition><SymptomChecker /></PageTransition>} />
        <Route path="/video-consultation" element={<PageTransition><VideoConsultation /></PageTransition>} />
        <Route path="/medical-records" element={<PageTransition><MedicalRecords /></PageTransition>} />
        <Route path="/pharmacy" element={<PageTransition><Pharmacy /></PageTransition>} />
        <Route path="/lab-tests" element={<PageTransition><LabTests /></PageTransition>} />
        <Route path="/emergency" element={<PageTransition><EmergencySOS /></PageTransition>} />
        <Route path="/health-awareness" element={<PageTransition><HealthAwareness /></PageTransition>} />
        <Route path="/book-appointment" element={<PageTransition><BookAppointment /></PageTransition>} />
        <Route path="/doctor-register" element={<PageTransition><DoctorRegister /></PageTransition>} />
        <Route path="/doctor-dashboard" element={<PageTransition><DoctorDashboard /></PageTransition>} />
        <Route path="/dashboard/profile" element={<PageTransition><PatientProfile /></PageTransition>} />
        <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
      </Routes>
    </AnimatePresence>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <LanguageProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
              <AnimatedRoutes />
              <FloatingSOSButton />
              <AIChatbot />
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </LanguageProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
