import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import {
  Users,
  TrendingUp,
  CheckCircle,
  Clock,
  Share2,
  Copy,
  Award,
  BarChart3,
  FileText,
  AlertCircle
} from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface PartnerProfile {
  id: string;
  organization_name: string;
  verified: boolean;
  verification_status: string;
  created_at: string;
}

interface ReferralStats {
  total: number;
  pending: number;
  contacted: number;
  completed: number;
}

interface Referral {
  id: string;
  name: string;
  contact_info: string;
  notes: string;
  status: string;
  created_at: string;
}

const PartnerDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [partner, setPartner] = useState<PartnerProfile | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [stats, setStats] = useState<ReferralStats>({ total: 0, pending: 0, contacted: 0, completed: 0 });
  const [loading, setLoading] = useState(true);
  const [referralForm, setReferralForm] = useState({ name: "", contact_info: "", notes: "" });
  const [submitting, setSubmitting] = useState(false);
  const [hasVerificationRequest, setHasVerificationRequest] = useState(false);
  const [checkingVerification, setCheckingVerification] = useState(true);
  const [verificationExpiry, setVerificationExpiry] = useState<{ expires_at: string; status: string } | null>(null);

  useEffect(() => {
    document.title = "Partner Dashboard | Forward Focus Elevation";
  }, []);

  useEffect(() => {
    if (user) {
      fetchPartnerData();
      checkVerificationRequest();
    }
  }, [user]);

  const checkVerificationRequest = async () => {
    try {
      const { data, error } = await supabase
        .from('partner_verifications')
        .select('id, status, expires_at')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      setHasVerificationRequest(!!data);
      if (data && data.status === 'approved' && data.expires_at) {
        setVerificationExpiry({ expires_at: data.expires_at, status: data.status });
      }
    } catch (error) {
      console.error('Error checking verification request:', error);
    } finally {
      setCheckingVerification(false);
    }
  };

  useEffect(() => {
    if (partner) {
      // Set up realtime subscription for referrals
      const channel = supabase
        .channel('partner-referrals')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'partner_referrals',
            filter: `partner_id=eq.${partner.id}`
          },
          () => {
            fetchReferrals();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [partner]);

  const fetchPartnerData = async () => {
    try {
      const { data: partnerData, error: partnerError } = await supabase
        .from('partners')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (partnerError) throw partnerError;

      setPartner(partnerData);
      await fetchReferrals();
    } catch (error) {
      console.error('Error fetching partner data:', error);
      toast({
        title: "Error",
        description: "Failed to load partner profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchReferrals = async () => {
    try {
      const { data: partnerData } = await supabase
        .from('partners')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!partnerData) return;

      const { data: referralData, error: referralError } = await supabase
        .from('partner_referrals')
        .select('*')
        .eq('partner_id', partnerData.id)
        .order('created_at', { ascending: false });

      if (referralError) throw referralError;

      setReferrals(referralData || []);

      // Calculate stats
      const newStats = {
        total: referralData?.length || 0,
        pending: referralData?.filter(r => r.status === 'pending')?.length || 0,
        contacted: referralData?.filter(r => r.status === 'contacted')?.length || 0,
        completed: referralData?.filter(r => r.status === 'completed')?.length || 0,
      };
      setStats(newStats);
    } catch (error) {
      console.error('Error fetching referrals:', error);
    }
  };

  const handleSubmitReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('partner_referrals')
        .insert({
          partner_id: partner?.id,
          name: referralForm.name,
          contact_info: referralForm.contact_info,
          notes: referralForm.notes,
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Referral submitted successfully!",
      });

      setReferralForm({ name: "", contact_info: "", notes: "" });
      await fetchReferrals();
    } catch (error) {
      console.error('Error submitting referral:', error);
      toast({
        title: "Error",
        description: "Failed to submit referral. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const copyReferralLink = () => {
    const link = `${window.location.origin}/request-partnership?ref=${partner?.id}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Copied!",
      description: "Referral link copied to clipboard",
    });
  };

  const getMonthlyData = () => {
    const monthlyStats: { [key: string]: { month: string; referrals: number; completed: number } } = {};

    referrals.forEach(referral => {
      const date = new Date(referral.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!monthlyStats[monthKey]) {
        monthlyStats[monthKey] = { month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }), referrals: 0, completed: 0 };
      }

      monthlyStats[monthKey].referrals++;
      if (referral.status === 'completed') {
        monthlyStats[monthKey].completed++;
      }
    });

    return Object.values(monthlyStats).sort((a, b) => a.month.localeCompare(b.month));
  };

  if (authLoading || loading) {
    return (
      <main id="main" className="container py-12">
        <div className="space-y-4">
          <Skeleton className="h-12 w-64" />
          <div className="grid gap-4 md:grid-cols-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </main>
    );
  }

  if (!user) {
    return <Navigate to="/partner-signin" replace />;
  }

  if (!partner) {
    return (
      <main id="main" className="container py-12">
        <Card>
          <CardContent className="py-12 text-center">
            <h2 className="text-2xl font-bold mb-4">No Partner Profile Found</h2>
            <p className="text-muted-foreground mb-6">
              You need to create a partner profile to access the dashboard.
            </p>
            <Button onClick={() => navigate('/partner-signup')}>
              Create Partner Profile
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main id="main" className="container py-6 sm:py-10 px-4 sm:px-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 gap-3">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-semibold">{partner.organization_name}</h1>
          <p className="text-muted-foreground text-sm sm:text-base">Partner Dashboard</p>
        </div>
        <Badge variant={partner.verified ? "default" : "secondary"} className="self-start sm:self-auto">
          {partner.verified ? "Verified Partner" : "Pending Verification"}
        </Badge>
      </div>

      {/* Expiration Warning Banner */}
      {verificationExpiry && (() => {
        const daysLeft = Math.ceil((new Date(verificationExpiry.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        if (daysLeft <= 30 && daysLeft > 0) {
          return (
            <Card className={`mb-8 ${daysLeft <= 7 ? 'bg-gradient-to-r from-red-50 to-rose-50 border-red-200' : 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200'}`}>
              <CardContent className="py-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className={`h-5 w-5 ${daysLeft <= 7 ? 'text-red-600' : 'text-amber-600'}`} />
                      <h3 className={`font-semibold ${daysLeft <= 7 ? 'text-red-900' : 'text-amber-900'}`}>
                        {daysLeft <= 7 ? 'URGENT: ' : ''}Verification Expiring Soon
                      </h3>
                    </div>
                    <p className={`text-sm ${daysLeft <= 7 ? 'text-red-800' : 'text-amber-800'} mb-4`}>
                      Your partner verification expires in <strong>{daysLeft} days</strong> on {new Date(verificationExpiry.expires_at).toLocaleDateString()}.
                      Renew now to maintain uninterrupted access to the partner portal and referral system.
                    </p>
                    <Button
                      onClick={() => navigate('/partners/renew-verification')}
                      className={daysLeft <= 7 ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-amber-600 hover:bg-amber-700 text-white'}
                    >
                      Renew Verification Now
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        } else if (daysLeft <= 0) {
          return (
            <Card className="mb-8 bg-gradient-to-r from-red-50 to-rose-50 border-red-200">
              <CardContent className="py-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="h-5 w-5 text-red-600" />
                      <h3 className="font-semibold text-red-900">Verification Expired</h3>
                    </div>
                    <p className="text-sm text-red-800 mb-4">
                      Your partner verification has expired. Renew now to restore access to all partner features.
                    </p>
                    <Button
                      onClick={() => navigate('/partners/renew-verification')}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      Renew Verification
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        }
        return null;
      })()}

      {/* Verification Request Banner */}
      {!checkingVerification && !hasVerificationRequest && (
        <Card className="mb-8 bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
          <CardContent className="py-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                  <h3 className="font-semibold text-amber-900">Complete Your Partner Verification</h3>
                </div>
                <p className="text-sm text-amber-800 mb-4">
                  Unlock all partnership features by completing your verification request. This helps us ensure quality connections and builds trust in our network.
                </p>
                <Button
                  onClick={() => navigate('/partners/request-verification')}
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                >
                  Complete Verification Now
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">All time referrals</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">Awaiting review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contacted</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.contacted}</div>
            <p className="text-xs text-muted-foreground">In progress</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed}</div>
            <p className="text-xs text-muted-foreground">Successfully helped</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="flex w-full overflow-x-auto bg-muted scrollbar-hide">
          <TabsTrigger value="overview" className="flex-shrink-0">Overview</TabsTrigger>
          <TabsTrigger value="referrals" className="flex-shrink-0">Referrals</TabsTrigger>
          <TabsTrigger value="new-referral" className="flex-shrink-0">New Referral</TabsTrigger>
          <TabsTrigger value="share" className="flex-shrink-0">Share & Earn</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Referral Trends</CardTitle>
              <CardDescription>Your referral activity over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={getMonthlyData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="referrals" stroke="hsl(var(--primary))" name="Total Referrals" />
                  <Line type="monotone" dataKey="completed" stroke="hsl(var(--chart-2))" name="Completed" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Status Breakdown</CardTitle>
              <CardDescription>Current status of all referrals</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={[
                  { status: 'Pending', count: stats.pending },
                  { status: 'Contacted', count: stats.contacted },
                  { status: 'Completed', count: stats.completed },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="status" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="referrals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Referrals</CardTitle>
              <CardDescription>Track and manage your referrals</CardDescription>
            </CardHeader>
            <CardContent>
              {referrals.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No referrals yet. Submit your first referral to get started!
                </div>
              ) : (
                <div className="space-y-4">
                  {referrals.map((referral) => (
                    <Card key={referral.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{referral.name}</CardTitle>
                          <Badge variant={
                            referral.status === 'completed' ? 'default' :
                              referral.status === 'contacted' ? 'secondary' :
                                'outline'
                          }>
                            {referral.status}
                          </Badge>
                        </div>
                        <CardDescription>
                          Contact: {referral.contact_info}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-2">{referral.notes}</p>
                        <p className="text-xs text-muted-foreground">
                          Submitted: {new Date(referral.created_at).toLocaleDateString()}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="new-referral">
          <Card>
            <CardHeader>
              <CardTitle>Submit New Referral</CardTitle>
              <CardDescription>
                Refer someone who could benefit from our services
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitReferral} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={referralForm.name}
                    onChange={(e) => setReferralForm({ ...referralForm, name: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact">Contact Information *</Label>
                  <Input
                    id="contact"
                    placeholder="Email or phone number"
                    value={referralForm.contact_info}
                    onChange={(e) => setReferralForm({ ...referralForm, contact_info: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Any additional information or specific needs..."
                    value={referralForm.notes}
                    onChange={(e) => setReferralForm({ ...referralForm, notes: e.target.value })}
                    rows={4}
                  />
                </div>

                <Button type="submit" disabled={submitting}>
                  {submitting ? "Submitting..." : "Submit Referral"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="share" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Share2 className="h-5 w-5" />
                <CardTitle>Your Referral Link</CardTitle>
              </div>
              <CardDescription>
                Share this link to track referrals from your network
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  value={`${window.location.origin}/request-partnership?ref=${partner.id}`}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button onClick={copyReferralLink} variant="outline" size="icon">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                <CardTitle>Partner Benefits</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h4 className="font-medium">Track Your Impact</h4>
                  <p className="text-sm text-muted-foreground">
                    See real-time updates on every referral you make
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <BarChart3 className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h4 className="font-medium">Analytics Dashboard</h4>
                  <p className="text-sm text-muted-foreground">
                    Access detailed insights and performance metrics
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h4 className="font-medium">Success Stories</h4>
                  <p className="text-sm text-muted-foreground">
                    Share and celebrate the impact of your referrals
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
};

export default PartnerDashboard;
