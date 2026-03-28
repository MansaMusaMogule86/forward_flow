import React, { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "@/contexts/AuthContext";
import { SecurityProvider } from "@/components/security/SecurityProvider";
import { SessionSecurityProvider } from "@/components/security/SessionSecurityProvider";
import { BrandedErrorBoundary } from "@/components/ui/BrandedErrorBoundary";
import { PageLoadingSkeleton } from "@/components/ui/loading-states";
import Layout from "./components/layout/Layout";
import { StateProvider } from "./contexts/StateContext";
import { AnalyticsProvider } from "./components/layout/AnalyticsProvider";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import AuthenticatedRoute from "./components/auth/AuthenticatedRoute";

// Eager load critical pages
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import GetHelpNow from "./pages/GetHelpNow";
import Auth from "./pages/Auth";
import AuthDebug from "./pages/AuthDebug";

// Lazy load secondary pages for better performance
const Welcome = lazy(() => import("./pages/Welcome"));
const VictimServices = lazy(() => import("./pages/VictimServices"));
const LearnGrow = lazy(() => import("./pages/LearnGrow"));
const AboutUs = lazy(() => import("./pages/AboutUs"));
const Support = lazy(() => import("./pages/Support"));
const Register = lazy(() => import("./pages/Register"));
const PartnerSignIn = lazy(() => import("./pages/PartnerSignIn"));
const PartnerSignUp = lazy(() => import("./pages/PartnerSignUp"));
const PartnerDashboard = lazy(() => import("./pages/PartnerDashboard"));
const Admin = lazy(() => import("./pages/Admin"));
const Search = lazy(() => import("./pages/Search"));
const Discover = lazy(() => import("./pages/Discover"));
const Partners = lazy(() => import("./pages/Partners"));
const SubmitReferral = lazy(() => import("./pages/SubmitReferral"));
const AddResource = lazy(() => import("./pages/AddResource"));
const RequestPartnership = lazy(() => import("./pages/RequestPartnership"));
const RequestPartnerVerification = lazy(() => import("./pages/RequestPartnerVerification"));
const RenewVerification = lazy(() => import("./pages/RenewVerification"));
const Organizations = lazy(() => import("./pages/Organizations"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const DonationSuccess = lazy(() => import("./pages/DonationSuccess"));
const SetupAdmin = lazy(() => import("./pages/SetupAdmin"));
const AdminGuide = lazy(() => import("./pages/AdminGuide"));
const SuccessStories = lazy(() => import("./pages/SuccessStories"));
const SetupGuide = lazy(() => import("./pages/SetupGuide"));
const YouthFutures = lazy(() => import("./pages/YouthFutures"));
const YouthElevation = lazy(() => import("./pages/YouthElevation"));

const queryClient = new QueryClient();

const App = () => {

  return (
  <BrandedErrorBoundary>
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SecurityProvider>
          <SessionSecurityProvider>
            <AuthProvider>
              {/* <AntiWhiteLabelProtection /> — disabled: monitorTampering() overrides console.log globally; re-enable after verifying production domain */}
              <Toaster />
              <Sonner />
              <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <AnalyticsProvider>
                  <StateProvider>
                    <Layout>
                      <Suspense fallback={<PageLoadingSkeleton />}>
                        <Routes>
                          <Route path="/" element={<Index />} />
                          <Route path="/welcome" element={<Welcome />} />
                          <Route path="/start" element={<Welcome />} />
                          <Route path="/help" element={<GetHelpNow />} />
                          <Route path="/get-help-now" element={<Navigate to="/help" replace />} />
                          <Route path="/ohio-resources" element={<Navigate to="/help" replace />} />
                          <Route path="/victim-services" element={<VictimServices />} />
                          <Route path="/healing-hub" element={<Navigate to="/victim-services" replace />} />
                          <Route path="/healing" element={<Navigate to="/victim-services" replace />} />
                          <Route path="/learn" element={<LearnGrow />} />
                          <Route path="/the-collective" element={<Navigate to="/learn" replace />} />
                          <Route path="/collective" element={<Navigate to="/learn" replace />} />
                          <Route path="/community" element={<Navigate to="/learn" replace />} />
                          <Route path="/about" element={<AboutUs />} />
                          <Route path="/support" element={<Support />} />
                          <Route path="/auth" element={<Auth />} />
                          <Route path="/auth-debug" element={<ProtectedRoute requiredRole="admin"><AuthDebug /></ProtectedRoute>} />
                          <Route path="/register" element={<Register />} />
                          <Route path="/partner-signin" element={<PartnerSignIn />} />
                          <Route path="/partner-signup" element={<PartnerSignUp />} />
                          <Route path="/partner-dashboard" element={<AuthenticatedRoute><PartnerDashboard /></AuthenticatedRoute>} />
                          <Route path="/login" element={<Navigate to="/auth" replace />} />
                          <Route path="/setup-admin" element={<SetupAdmin />} />
                          <Route path="/setup-guide" element={<SetupGuide />} />
                          <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><Admin /></ProtectedRoute>} />
                          <Route path="/admin/*" element={<ProtectedRoute requiredRole="admin"><Navigate to="/admin" replace /></ProtectedRoute>} />
                          <Route path="/admin-guide" element={<AdminGuide />} />
                          <Route path="/success-stories" element={<SuccessStories />} />
                          <Route path="/dashboard" element={<AuthenticatedRoute><Navigate to="/" replace /></AuthenticatedRoute>} />
                          <Route path="/dashboard/*" element={<AuthenticatedRoute><Navigate to="/" replace /></AuthenticatedRoute>} />
                          <Route path="/portal/*" element={<AuthenticatedRoute><Navigate to="/" replace /></AuthenticatedRoute>} />
                          <Route path="/search" element={<Search />} />
                          <Route path="/discover" element={<Discover />} />
                          <Route path="/youth-futures" element={<YouthFutures />} />
                          <Route path="/youth-elevation" element={<YouthElevation />} />
                          <Route path="/youth" element={<Navigate to="/youth-futures" replace />} />
                          <Route path="/partners" element={<Partners />} />
                          <Route path="/partners/submit-referral" element={<SubmitReferral />} />
                          <Route path="/partners/add-resource" element={<AddResource />} />
                          <Route path="/partners/request" element={<RequestPartnership />} />
                          <Route path="/partners/request-verification" element={<RequestPartnerVerification />} />
                          <Route path="/partners/renew-verification" element={<RenewVerification />} />
                          <Route path="/RequestPartnership" element={<RequestPartnership />} />
                          <Route path="/organizations" element={<Organizations />} />
                          <Route path="/privacy" element={<PrivacyPolicy />} />
                          <Route path="/terms" element={<TermsOfService />} />
                          <Route path="/donation-success" element={<DonationSuccess />} />
                          <Route path="/resources/:id" element={<Navigate to="/help" replace />} />
                          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                          <Route path="*" element={<NotFound />} />
                        </Routes>
                      </Suspense>
                    </Layout>
                  </StateProvider>
                </AnalyticsProvider>
              </BrowserRouter>
            </AuthProvider>
          </SessionSecurityProvider>
        </SecurityProvider>
      </TooltipProvider>
    </QueryClientProvider>
    </HelmetProvider>
  </BrandedErrorBoundary>
  );
};

export default App;
