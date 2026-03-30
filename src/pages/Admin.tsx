import { useEffect, useState, lazy, Suspense } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { maskContactInfo } from "@/lib/security";
import { Eye, EyeOff, Shield } from "lucide-react";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { AdminSetupBanner } from "@/components/admin/AdminSetupBanner";
import { RealtimeNotifications } from "@/components/admin/RealtimeNotifications";
import { usePagination } from "@/hooks/usePagination";
import { DataPagination } from "@/components/ui/data-pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { logger } from "@/lib/logger";

// Lazy load heavy components for better performance
const SecurityMonitoringDashboard = lazy(() => import("@/components/security/SecurityMonitoringDashboard").then(m => ({ default: m.SecurityMonitoringDashboard })));
const EmailMarketingDashboard = lazy(() => import("@/components/admin/EmailMarketingDashboard").then(m => ({ default: m.EmailMarketingDashboard })));
const EmailDeliverabilityDashboard = lazy(() => import("@/components/admin/EmailDeliverabilityDashboard").then(m => ({ default: m.default })));
const EmailAutomationManager = lazy(() => import("@/components/admin/EmailAutomationManager").then(m => ({ default: m.default })));
const ContactAccessManager = lazy(() => import("@/components/security/ContactAccessManager").then(m => ({ default: m.ContactAccessManager })));
const JustificationManager = lazy(() => import("@/components/admin/JustificationManager").then(m => ({ default: m.JustificationManager })));
const UserAnalyticsDashboard = lazy(() => import("@/components/admin/UserAnalyticsDashboard").then(m => ({ default: m.UserAnalyticsDashboard })));
const WebsitePerformance = lazy(() => import("@/components/admin/WebsitePerformance").then(m => ({ default: m.WebsitePerformance })));
const LaunchChecklist = lazy(() => import("@/components/launch/LaunchChecklist").then(m => ({ default: m.LaunchChecklist })));
const AdminSetup = lazy(() => import("@/components/admin/AdminSetup").then(m => ({ default: m.AdminSetup })));
const LaunchInstructions = lazy(() => import("@/components/admin/LaunchInstructions").then(m => ({ default: m.LaunchInstructions })));
const PartnerVerificationManager = lazy(() => import("@/components/admin/PartnerVerificationManager").then(m => ({ default: m.PartnerVerificationManager })));
const SuccessStoriesManager = lazy(() => import("@/components/admin/SuccessStoriesManager").then(m => ({ default: m.SuccessStoriesManager })));
const MarketingImageGenerator = lazy(() => import("@/components/ai/MarketingImageGenerator").then(m => ({ default: m.MarketingImageGenerator })));
const PreLaunchChecklist = lazy(() => import("@/components/admin/PreLaunchChecklist").then(m => ({ default: m.PreLaunchChecklist })));
const LoginSecurityMonitor = lazy(() => import("@/components/admin/LoginSecurityMonitor").then(m => ({ default: m.LoginSecurityMonitor })));
const ApiKeyRotationManager = lazy(() => import("@/components/admin/ApiKeyRotationManager").then(m => ({ default: m.ApiKeyRotationManager })));
const MFASettings = lazy(() => import("@/components/admin/MFASettings").then(m => ({ default: m.MFASettings })));

const ComponentLoader = () => (
  <div className="space-y-4">
    <Skeleton className="h-32 w-full" />
    <Skeleton className="h-32 w-full" />
    <Skeleton className="h-32 w-full" />
  </div>
);

interface PartnerReferral {
  id: string;
  name: string;
  contact_info: string;
  notes: string;
  status: string;
  created_at: string;
}

interface PartnershipRequest {
  id: string;
  organization: string;
  email: string;
  message: string;
  status: string;
  created_at: string;
  updated_at: string;
  name: string;
}

interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: string;
  created_at: string;
}

interface SupportRequest {
  id: string;
  request_type: string;
  name: string;
  email: string;
  organization: string;
  phone: string;
  subject: string;
  message: string;
  request_data: any;
  status: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  assigned_to: string;
  notes: string;
}

interface BookingRequest {
  id: string;
  name: string;
  email: string;
  phone: string;
  scheduled_date: string;
  scheduled_time: string;
  notes: string;
  status: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  booking_type: string;
  duration_minutes: number;
  reminder_sent: boolean;
}

const Admin = () => {
  const { user, loading } = useAuth();
  const { isAdmin, isChecking: checkingAdmin } = useAdminCheck(user);
  const [referrals, setReferrals] = useState<PartnerReferral[]>([]);
  const [partnershipRequests, setPartnershipRequests] = useState<PartnershipRequest[]>([]);
  const [contactSubmissions, setContactSubmissions] = useState<ContactSubmission[]>([]);
  const [supportRequests, setSupportRequests] = useState<SupportRequest[]>([]);
  const [bookingRequests, setBookingRequests] = useState<BookingRequest[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [revealedContacts, setRevealedContacts] = useState<Set<string>>(new Set());
  const [adminExists, setAdminExists] = useState<boolean | null>(null);
  const [loadingTimeout, setLoadingTimeout] = useState(false);


  // Loading timeout detection
  useEffect(() => {
    const timeout = setTimeout(() => setLoadingTimeout(true), 8000);
    return () => clearTimeout(timeout);
  }, []);
  const [partnerStats, setPartnerStats] = useState({ 
    total_partners: 0, 
    verified_partners: 0, 
    pending_partners: 0, 
    total_referrals: 0,
    total_success_stories: 0,
    published_success_stories: 0
  });
  
  const referralsPagination = usePagination({ items: referrals });
  const partnershipsPagination = usePagination({ items: partnershipRequests });
  const contactsPagination = usePagination({ items: contactSubmissions });
  const supportPagination = usePagination({ items: supportRequests });
  const bookingsPagination = usePagination({ items: bookingRequests });
  
  // Check if admin exists in system
  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const { data } = await supabase.rpc('check_admin_exists');
        setAdminExists(data || false);
      } catch (error) {
        logger.error('Error checking admin exists:', error);
        setAdminExists(false);
      }
    };
    checkAdmin();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!isAdmin) return;

      setLoadingData(true);
      try {
        // Fetch partner stats first for dashboard summary
        const { data: stats } = await supabase.rpc('get_partner_stats_detailed');
        if (stats && stats.length > 0) {
          setPartnerStats(stats[0]);
        }

        const [referralsRes, requestsRes, contactsRes, supportRes, bookingsRes] = await Promise.all([
          supabase.from('partner_referrals').select('*').order('created_at', { ascending: false }),
          supabase.from('partnership_requests').select('*').order('created_at', { ascending: false }),
          supabase.from('contact_submissions').select('*').order('created_at', { ascending: false }),
          supabase.from('support_requests').select('*').order('created_at', { ascending: false }),
          supabase.from('bookings').select('*').order('created_at', { ascending: false })
        ]);

        if (referralsRes.error) {
          logger.error('Error fetching referrals:', referralsRes.error);
        } else {
          setReferrals(referralsRes.data || []);
        }

        if (requestsRes.error) {
          logger.error('Error fetching partnership requests:', requestsRes.error);
        } else {
          setPartnershipRequests(requestsRes.data || []);
        }

        if (contactsRes.error) {
          logger.error('Error fetching contact submissions:', contactsRes.error);
        } else {
          setContactSubmissions(contactsRes.data || []);
        }

        if (supportRes.error) {
          logger.error('Error fetching support requests:', supportRes.error);
        } else {
          setSupportRequests(supportRes.data || []);
        }

        if (bookingsRes.error) {
          logger.error('Error fetching booking requests:', bookingsRes.error);
        } else {
          setBookingRequests(bookingsRes.data || []);
        }
      } catch (error) {
        logger.error('Error fetching admin data:', error);
      } finally {
        setLoadingData(false);
      }
    };

    if (isAdmin) {
      fetchData();

      // Set up realtime subscriptions for automatic updates
      const channels = [
        supabase
          .channel('admin-referrals')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'partner_referrals' }, () => {
            supabase.from('partner_referrals').select('*').order('created_at', { ascending: false })
              .then(({ data }) => setReferrals(data || []));
          })
          .subscribe(),

        supabase
          .channel('admin-partnerships')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'partnership_requests' }, () => {
            supabase.from('partnership_requests').select('*').order('created_at', { ascending: false })
              .then(({ data }) => setPartnershipRequests(data || []));
          })
          .subscribe(),

        supabase
          .channel('admin-contacts')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'contact_submissions' }, () => {
            supabase.from('contact_submissions').select('*').order('created_at', { ascending: false })
              .then(({ data }) => setContactSubmissions(data || []));
          })
          .subscribe(),

        supabase
          .channel('admin-support')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'support_requests' }, () => {
            supabase.from('support_requests').select('*').order('created_at', { ascending: false })
              .then(({ data }) => setSupportRequests(data || []));
          })
          .subscribe(),

        supabase
          .channel('admin-bookings')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
            supabase.from('bookings').select('*').order('created_at', { ascending: false })
              .then(({ data }) => setBookingRequests(data || []));
          })
          .subscribe()
      ];

      return () => {
        channels.forEach(channel => supabase.removeChannel(channel));
      };
    }
  }, [isAdmin]);

  const toggleContactVisibility = async (id: string, contactInfo: string) => {
      // Check admin operation limits before proceeding
    try {
      const { data: canProceed, error: rateLimitError } = await supabase.rpc('check_admin_operation_limit');

      if (rateLimitError || !canProceed) {
        toast({
          title: "Rate limit exceeded",
          description: "Too many contact reveals in the last hour. Please try again later.",
          variant: "destructive",
        });
        return;
      }

      const newRevealed = new Set(revealedContacts);
      if (newRevealed.has(id)) {
        newRevealed.delete(id);
      } else {
        newRevealed.add(id);
        
        // Log contact reveal for audit trail
      }
      setRevealedContacts(newRevealed);
    } catch (error) {
      logger.error('Error in contact visibility toggle:', error);
      toast({
        title: "Error",
        description: "Failed to toggle contact visibility",
        variant: "destructive",
      });
    }
  };

  const updateStatus = async (table: 'partner_referrals' | 'partnership_requests' | 'contact_submissions' | 'support_requests' | 'bookings', id: string, newStatus: string) => {
    try {
      // Check admin operation limits
      const { data: canProceed, error: rateLimitError } = await supabase.rpc('check_admin_operation_limit');

      if (rateLimitError || !canProceed) {
        toast({
          title: "Rate limit exceeded",
          description: "Too many status updates in the last hour. Please try again later.",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from(table)
        .update({ status: newStatus })
        .eq('id', id);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to update status",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Status updated successfully",
        });
        
        // Log status update for audit trail

        // Refresh data
        if (table === 'partner_referrals') {
          const { data } = await supabase.from('partner_referrals').select('*').order('created_at', { ascending: false });
          setReferrals(data || []);
        } else if (table === 'partnership_requests') {
          const { data } = await supabase.from('partnership_requests').select('*').order('created_at', { ascending: false });
          setPartnershipRequests(data || []);
        } else if (table === 'contact_submissions') {
          const { data } = await supabase.from('contact_submissions').select('*').order('created_at', { ascending: false });
          setContactSubmissions(data || []);
        } else if (table === 'support_requests') {
          const { data } = await supabase.from('support_requests').select('*').order('created_at', { ascending: false });
          setSupportRequests(data || []);
        } else if (table === 'bookings') {
          const { data } = await supabase.from('bookings').select('*').order('created_at', { ascending: false });
          setBookingRequests(data || []);
        }
      }
    } catch (error) {
      logger.error('Error updating status:', error);
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    }
  };

  if (loading || checkingAdmin || adminExists === null) {
    return (
      <main id="main" className="container py-12 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-2 text-muted-foreground">
            {loadingTimeout ? 'Still loading... This may indicate a connection issue.' : 'Loading...'}
          </p>
          {loadingTimeout && (
            <div className="mt-4 p-4 bg-muted rounded-lg text-sm text-left max-w-md mx-auto">
              <p className="font-medium mb-2">Troubleshooting:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Check your internet connection</li>
                <li>Ensure you're logged in with an admin account</li>
                <li>Try refreshing the page</li>
              </ul>
            </div>
          )}
        </div>
      </main>
    );
  }

  // If no admin exists in the system, redirect to setup
  if (adminExists === false) {
    return <Navigate to="/setup-admin" replace />;
  }

  // If admin exists but user is not logged in, redirect to auth
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // If user is logged in but not an admin, redirect to home
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <main id="main" className="container py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-heading text-3xl font-semibold">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            <a href="/admin-guide" target="_blank" className="text-primary hover:underline">
              View Admin Guide →
            </a>
          </p>
        </div>
        <RealtimeNotifications />
      </div>

      {/* Quick Stats Summary */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Partners</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{partnerStats.total_partners}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {partnerStats.verified_partners} verified
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Verification</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{partnerStats.pending_partners}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Require review
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Referrals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{partnerStats.total_referrals}</div>
            <p className="text-xs text-muted-foreground mt-1">
              All time
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Success Stories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{partnerStats.published_success_stories || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Published stories
            </p>
          </CardContent>
        </Card>
      </div>
      
      <AdminSetupBanner />
      
      <Tabs defaultValue="management" className="space-y-6">
        <TabsList className="flex flex-wrap justify-start gap-1 h-auto bg-muted/50 p-1">
          <TabsTrigger value="launch" className="data-[state=active]:bg-background">
            🚀 Launch
          </TabsTrigger>
          <TabsTrigger value="management" className="data-[state=active]:bg-background">
            🤝 Partners
          </TabsTrigger>
          <TabsTrigger value="verifications" className="data-[state=active]:bg-background">
            ✓ Verify
          </TabsTrigger>
          <TabsTrigger value="stories" className="data-[state=active]:bg-background">
            📖 Stories
          </TabsTrigger>
          <TabsTrigger value="submissions" className="data-[state=active]:bg-background">
            📋 Forms
          </TabsTrigger>
          <TabsTrigger value="support" className="data-[state=active]:bg-background">
            💬 Support
          </TabsTrigger>
          <TabsTrigger value="bookings" className="data-[state=active]:bg-background">
            📅 Bookings
          </TabsTrigger>
          <TabsTrigger value="analytics" className="data-[state=active]:bg-background">
            📊 Analytics
          </TabsTrigger>
          <TabsTrigger value="email" className="data-[state=active]:bg-background">
            📧 Email
          </TabsTrigger>
          <TabsTrigger value="security" className="data-[state=active]:bg-background">
            🔒 Security
          </TabsTrigger>
          <TabsTrigger value="organizations" className="data-[state=active]:bg-background">
            🏢 Orgs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="launch">
          <Suspense fallback={<ComponentLoader />}>
            <div className="space-y-6">
              <div>
                <h2 className="font-heading text-2xl font-semibold mb-2">Launch Readiness</h2>
                <p className="text-muted-foreground mb-6">
                  Complete these final steps to prepare your application for production launch.
                </p>
              </div>
              
              <PreLaunchChecklist />
              <AdminSetup />
              <LaunchChecklist />
              <LaunchInstructions />
            </div>
          </Suspense>
        </TabsContent>

        <TabsContent value="management">
          <div className="grid gap-8">
        {/* Partner Referrals Section */}
        <section>
          <h2 className="font-heading text-2xl font-semibold mb-4">Partner Referrals</h2>
          {loadingData ? (
            <div className="text-center py-8">
              <div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
            </div>
          ) : referrals.length === 0 ? (
            <Card>
              <CardContent className="py-8">
                <p className="text-center text-muted-foreground">No referrals yet</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid gap-4">
                {referralsPagination.paginatedItems.map((referral) => (
                <Card key={referral.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{referral.name}</CardTitle>
                      <Badge variant={referral.status === 'new' ? 'default' : 'secondary'}>
                        {referral.status}
                      </Badge>
                    </div>
                    <CardDescription>
                      <div className="flex items-center gap-2">
                        <span>Contact: </span>
                        <span className="font-mono">
                          {revealedContacts.has(referral.id) 
                            ? referral.contact_info 
                            : maskContactInfo(referral.contact_info)
                          }
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleContactVisibility(referral.id, referral.contact_info)}
                          className="h-6 w-6 p-0"
                        >
                          {revealedContacts.has(referral.id) ? (
                            <EyeOff className="h-3 w-3" />
                          ) : (
                            <Eye className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm mb-4">{referral.notes}</p>
                    <div className="flex gap-2">
                      {referral.status === 'new' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => updateStatus('partner_referrals', referral.id, 'contacted')}
                          >
                            Mark as Contacted
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateStatus('partner_referrals', referral.id, 'completed')}
                          >
                            Mark as Completed
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <DataPagination
              currentPage={referralsPagination.currentPage}
              totalPages={referralsPagination.totalPages}
              onPageChange={referralsPagination.goToPage}
              hasNextPage={referralsPagination.hasNextPage}
              hasPreviousPage={referralsPagination.hasPreviousPage}
            />
          </>
          )}
        </section>

        {/* Partnership Requests Section */}
        <section>
          <h2 className="font-heading text-2xl font-semibold mb-4">Partnership Requests</h2>
          {loadingData ? (
            <div className="text-center py-8">
              <div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
            </div>
          ) : partnershipRequests.length === 0 ? (
            <Card>
              <CardContent className="py-8">
                <p className="text-center text-muted-foreground">No partnership requests yet</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid gap-4">
                {partnershipsPagination.paginatedItems.map((request) => (
                <Card key={request.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{request.organization}</CardTitle>
                      <Badge variant={request.status === 'new' ? 'default' : 'secondary'}>
                        {request.status}
                      </Badge>
                    </div>
                    <CardDescription>
                      <div className="flex items-center gap-2">
                        <span>Email: </span>
                        <span className="font-mono">
                          {revealedContacts.has(request.id) 
                            ? request.email 
                            : maskContactInfo(request.email)
                          }
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleContactVisibility(request.id, request.email)}
                          className="h-6 w-6 p-0"
                        >
                          {revealedContacts.has(request.id) ? (
                            <EyeOff className="h-3 w-3" />
                          ) : (
                            <Eye className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm mb-4">{request.message}</p>
                    <div className="flex gap-2">
                      {request.status === 'new' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => updateStatus('partnership_requests', request.id, 'reviewing')}
                          >
                            Mark as Reviewing
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateStatus('partnership_requests', request.id, 'approved')}
                          >
                            Approve
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <DataPagination
              currentPage={partnershipsPagination.currentPage}
              totalPages={partnershipsPagination.totalPages}
              onPageChange={partnershipsPagination.goToPage}
              hasNextPage={partnershipsPagination.hasNextPage}
              hasPreviousPage={partnershipsPagination.hasPreviousPage}
            />
          </>
          )}
        </section>
          </div>
        </TabsContent>

        <TabsContent value="submissions">
          <div className="space-y-6">
            <h2 className="font-heading text-2xl font-semibold">Contact Form Submissions</h2>
            {loadingData ? (
              <div className="text-center py-8">
                <div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
              </div>
            ) : contactSubmissions.length === 0 ? (
              <Card>
                <CardContent className="py-8">
                  <p className="text-center text-muted-foreground">No contact submissions yet</p>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid gap-4">
                  {contactsPagination.paginatedItems.map((submission) => (
                  <Card key={submission.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{submission.name}</CardTitle>
                        <div className="flex gap-2">
                          <Badge variant={submission.status === 'new' ? 'default' : 'secondary'}>
                            {submission.status}
                          </Badge>
                        </div>
                      </div>
                      <CardDescription>
                        Email: {submission.email} • Subject: {submission.subject}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm mb-4">{submission.message}</p>
                      <div className="flex gap-2 text-xs text-muted-foreground">
                        <span>Submitted: {new Date(submission.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="flex gap-2 mt-4">
                        {submission.status === 'new' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => updateStatus('contact_submissions', submission.id, 'responded')}
                            >
                              Mark as Responded
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateStatus('contact_submissions', submission.id, 'resolved')}
                            >
                              Mark as Resolved
                            </Button>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <DataPagination
                currentPage={contactsPagination.currentPage}
                totalPages={contactsPagination.totalPages}
                onPageChange={contactsPagination.goToPage}
                hasNextPage={contactsPagination.hasNextPage}
                hasPreviousPage={contactsPagination.hasPreviousPage}
              />
            </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="support">
          <div className="space-y-6">
            <h2 className="font-heading text-2xl font-semibold">Support Program Requests</h2>
            {loadingData ? (
              <div className="text-center py-8">
                <div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
              </div>
            ) : supportRequests.length === 0 ? (
              <Card>
                <CardContent className="py-8">
                  <p className="text-center text-muted-foreground">No support requests yet</p>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid gap-4">
                  {supportPagination.paginatedItems.map((request) => (
                  <Card key={request.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{request.name}</CardTitle>
                        <div className="flex gap-2">
                          <Badge variant="outline">{request.request_type}</Badge>
                          <Badge variant={request.status === 'new' ? 'default' : 'secondary'}>
                            {request.status}
                          </Badge>
                        </div>
                      </div>
                      <CardDescription>
                        Email: {request.email} • Organization: {request.organization || 'N/A'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm mb-2"><strong>Subject:</strong> {request.subject}</p>
                      <p className="text-sm mb-4">{request.message}</p>
                      {request.request_data && Object.keys(request.request_data).length > 0 && (
                        <div className="mt-4 p-3 bg-secondary/20 rounded-lg">
                          <p className="text-xs font-medium mb-2">Additional Details:</p>
                          <div className="text-xs space-y-1">
                            {Object.entries(request.request_data).map(([key, value]) => (
                              <div key={key}>
                                <strong>{key.replace(/_/g, ' ')}:</strong> {Array.isArray(value) ? value.join(', ') : String(value)}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="flex gap-2 text-xs text-muted-foreground mt-4">
                        <span>Submitted: {new Date(request.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="flex gap-2 mt-4">
                        {request.status === 'new' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => updateStatus('support_requests', request.id, 'reviewing')}
                            >
                              Mark as Reviewing
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateStatus('support_requests', request.id, 'approved')}
                            >
                              Approve Request
                            </Button>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <DataPagination
                currentPage={supportPagination.currentPage}
                totalPages={supportPagination.totalPages}
                onPageChange={supportPagination.goToPage}
                hasNextPage={supportPagination.hasNextPage}
                hasPreviousPage={supportPagination.hasPreviousPage}
              />
            </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="bookings">
          <div className="space-y-6">
            <h2 className="font-heading text-2xl font-semibold">Consultation Bookings</h2>
            {loadingData ? (
              <div className="text-center py-8">
                <div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
              </div>
            ) : bookingRequests.length === 0 ? (
              <Card>
                <CardContent className="py-8">
                  <p className="text-center text-muted-foreground">No bookings yet</p>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid gap-4">
                  {bookingsPagination.paginatedItems.map((booking) => (
                  <Card key={booking.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{booking.name}</CardTitle>
                        <Badge variant={booking.status === 'confirmed' ? 'default' : 'secondary'}>
                          {booking.status}
                        </Badge>
                      </div>
                      <CardDescription>
                        Email: {booking.email} • Phone: {booking.phone || 'N/A'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-sm font-medium">Date</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(booking.scheduled_date).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">Time</p>
                          <p className="text-sm text-muted-foreground">{booking.scheduled_time}</p>
                        </div>
                      </div>
                      {booking.notes && (
                        <p className="text-sm mb-4">{booking.notes}</p>
                      )}
                      <div className="flex gap-2 text-xs text-muted-foreground">
                        <span>Booked: {new Date(booking.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="flex gap-2 mt-4">
                        {booking.status === 'confirmed' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => updateStatus('bookings', booking.id, 'completed')}
                            >
                              Mark as Completed
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateStatus('bookings', booking.id, 'cancelled')}
                            >
                              Mark as Cancelled
                            </Button>
                          </>
                        )}
                      </div>
                    </CardContent>
                </Card>
              ))}
            </div>
            <DataPagination
              currentPage={bookingsPagination.currentPage}
              totalPages={bookingsPagination.totalPages}
              onPageChange={bookingsPagination.goToPage}
              hasNextPage={bookingsPagination.hasNextPage}
              hasPreviousPage={bookingsPagination.hasPreviousPage}
            />
          </>
          )}
          </div>
        </TabsContent>

        <TabsContent value="organizations">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-2xl font-semibold">Organizations Management</h2>
              <Button onClick={() => window.open('/organizations', '_blank')} variant="outline">
                View Organizations Page
              </Button>
            </div>
            <Card>
              <CardContent className="p-6">
                <p className="text-muted-foreground mb-4">
                  Manage all verified organizations and resources in the platform. Organizations are community partners
                  that provide services and support to our members.
                </p>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="p-4 bg-primary/5 rounded-lg">
                    <h3 className="font-medium mb-1">Quick Actions</h3>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Review organization verifications</li>
                      <li>• Manage contact access permissions</li>
                      <li>• Update organization status</li>
                    </ul>
                  </div>
                  <div className="p-4 bg-secondary/20 rounded-lg">
                    <h3 className="font-medium mb-1">Security Features</h3>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Contact info masking for safety</li>
                      <li>• Access justification requirements</li>
                      <li>• Comprehensive audit logging</li>
                    </ul>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button onClick={() => window.open('/organizations', '_blank')}>
                    <Shield className="h-4 w-4 mr-2" />
                    Manage Organizations
                  </Button>
                  <Button variant="outline" onClick={() => window.open('/add-resource', '_blank')}>
                    Add New Resource
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="verifications">
          <Suspense fallback={<ComponentLoader />}>
            <div className="space-y-6">
              <h2 className="font-heading text-2xl font-semibold">Partner Verification Management</h2>
              <p className="text-muted-foreground">
                Review and manage partner verification requests. Approve or deny requests to grant verified partner status.
              </p>
              <PartnerVerificationManager />
            </div>
          </Suspense>
        </TabsContent>

        <TabsContent value="stories">
          <Suspense fallback={<ComponentLoader />}>
            <SuccessStoriesManager />
          </Suspense>
        </TabsContent>

        <TabsContent value="analytics">
          <Suspense fallback={<ComponentLoader />}>
            <div className="space-y-6">
              <h2 className="font-heading text-2xl font-semibold">Analytics Dashboard</h2>
              
              <Tabs defaultValue="user-analytics" className="space-y-6">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="user-analytics">User Analytics</TabsTrigger>
                  <TabsTrigger value="performance">Performance</TabsTrigger>
                </TabsList>
                
                <TabsContent value="user-analytics">
                  <UserAnalyticsDashboard />
                </TabsContent>
                
                <TabsContent value="performance">
                  <WebsitePerformance />
                </TabsContent>
              </Tabs>
            </div>
          </Suspense>
        </TabsContent>

        <TabsContent value="email">
          <Suspense fallback={<ComponentLoader />}>
            <Tabs defaultValue="deliverability" className="space-y-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="deliverability">Deliverability</TabsTrigger>
                <TabsTrigger value="automation">Automation</TabsTrigger>
                <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
              </TabsList>
              
              <TabsContent value="deliverability">
                <EmailDeliverabilityDashboard />
              </TabsContent>
              
              <TabsContent value="automation">
                <EmailAutomationManager />
              </TabsContent>
              
              <TabsContent value="campaigns">
                <div className="space-y-6">
                  <EmailMarketingDashboard />
                  <MarketingImageGenerator />
                </div>
              </TabsContent>
            </Tabs>
          </Suspense>
        </TabsContent>

        <TabsContent value="security">
          <Suspense fallback={<ComponentLoader />}>
            <div className="space-y-6">
              <h2 className="font-heading text-2xl font-semibold">Security Management</h2>
              <Tabs defaultValue="login-security" className="space-y-6">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="login-security">Login Security</TabsTrigger>
                  <TabsTrigger value="api-keys">API Keys</TabsTrigger>
                  <TabsTrigger value="mfa">MFA Settings</TabsTrigger>
                  <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
                </TabsList>
                
                <TabsContent value="login-security">
                  <LoginSecurityMonitor />
                </TabsContent>
                
                <TabsContent value="api-keys">
                  <ApiKeyRotationManager />
                </TabsContent>
                
                <TabsContent value="mfa">
                  <MFASettings />
                </TabsContent>
                
                <TabsContent value="monitoring">
                  <SecurityMonitoringDashboard />
                </TabsContent>
              </Tabs>
            </div>
          </Suspense>
        </TabsContent>
      </Tabs>
    </main>
  );
};

export default Admin;