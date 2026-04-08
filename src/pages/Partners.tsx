import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Users,
  FileText,
  Plus,
  TrendingUp,
  CheckCircle,
  Clock,
  AlertCircle,
  BarChart3,
  UserCheck,
  Building2,
  Handshake,
  Target,
  Award,
  Bot
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { PartnerVerificationStatus } from "@/components/partner/PartnerVerificationStatus";
import { PartnerSupportChatbot } from "@/components/ai/PartnerSupportChatbot";

// Import hero image
import partnershipCollaboration from "@/assets/images/community/partnership-collaboration.jpg";

interface PartnerStats {
  totalReferrals: number;
  activeReferrals: number;
  completedReferrals: number;
  resourcesAdded: number;
  impactScore: number;
}

const Partners = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<PartnerStats>({
    totalReferrals: 0,
    activeReferrals: 0,
    completedReferrals: 0,
    resourcesAdded: 0,
    impactScore: 0,
  });
  const [loading, setLoading] = useState(true);

  // Check URL params for active tab
  const urlParams = new URLSearchParams(window.location.search);
  const initialTab = urlParams.get('tab') || 'dashboard';

  useEffect(() => {
    document.title = "Partner Portal | Forward Focus Elevation";
    if (user) {
      fetchPartnerStats();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchPartnerStats = async () => {
    try {
      const { data, error } = await supabase.rpc('get_partner_stats');

      if (!error && data && typeof data === 'object') {
        const statsData = data as any;
        setStats({
          totalReferrals: statsData.totalReferrals || 0,
          activeReferrals: statsData.activeReferrals || 0,
          completedReferrals: statsData.completedReferrals || 0,
          resourcesAdded: statsData.resourcesAdded || 0,
          impactScore: statsData.impactScore || 0,
        });
      }
      // Silently ignore errors - stats display as 0 if unavailable
    } catch (error) {
      console.error("Error fetching partner stats:", error);
      // Stats show as 0 rather than surfacing an error to the user
    } finally {
      setLoading(false);
    }
  };

  const partnerBenefits = [
    {
      icon: Plus,
      title: "Contribute Resources",
      description: "Add your organization's services to our 88-county directory and reach those who need them most.",
    },
    {
      icon: UserCheck,
      title: "Streamlined Referrals",
      description: "Submit and track referrals directly through our secure portal to ensure no one falls through the cracks.",
    },
    {
      icon: Handshake,
      title: "Strategic Collaboration",
      description: "Join a high-impact network of Ohio organizations committed to second chances and healing.",
    },
    {
      icon: BarChart3,
      title: "Visibility & Data",
      description: "Gain recognition as a verified partner and track your contribution to community outcomes.",
    },
  ];

  const quickActions = [
    {
      title: "Add a Resource",
      description: "List your services in our directory",
      icon: Plus,
      href: "/partners/add-resource",
      variant: "default" as const,
    },
    {
      title: "Submit a Referral",
      description: "Connect someone with support",
      icon: UserCheck,
      href: "/partners/submit-referral",
      variant: "secondary" as const,
    },
    {
      title: "AI Resource Hub",
      description: "Find and share local services",
      icon: FileText,
      href: "/discover",
      variant: "outline" as const,
    },
    {
      title: "Request Partnership",
      description: "Become a verified organization",
      icon: Building2,
      href: "/partners/request",
      variant: "outline" as const,
    },
  ];

  if (loading) {
    return (
      <main id="main" className="min-h-screen bg-gradient-to-br from-osu-scarlet/5 via-background to-osu-gray/5 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-osu-scarlet border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-2 text-osu-gray">Loading partner portal...</p>
        </div>
      </main>
    );
  }

  return (
    <main id="main" className="min-h-screen bg-gradient-to-br from-osu-scarlet/5 via-background to-osu-gray/5">
      <div className="max-w-6xl mx-auto px-6 py-4">
        {/* Header with Hero Image */}
        <div className="mb-6">
          <div className="relative rounded-2xl overflow-hidden shadow-2xl">
            <img
              src={partnershipCollaboration}
              alt="Diverse team of professionals working together on community partnerships"
              className="w-full h-48 md:h-64 object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-osu-scarlet/90 to-osu-gray/80 flex items-center justify-center">
              <div className="text-center text-white max-w-4xl px-6">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <Building2 className="h-10 w-10" />
                  {user && (
                    <Badge variant="secondary" className="text-sm px-3 py-1 inline-flex items-center gap-2 bg-white/20 text-white border-white/30">
                      <CheckCircle className="h-4 w-4" />
                      Authenticated Partner
                    </Badge>
                  )}
                </div>
                <h1 className="font-heading text-3xl md:text-4xl font-bold mb-2">Partner Portal</h1>
                <p className="text-lg md:text-xl leading-relaxed">
                  Join Ohio's Premier Resource Network for Second Chances & Healing
                </p>
              </div>
            </div>
          </div>
        </div>

        <Tabs defaultValue={initialTab} className="space-y-4">
          <TabsList className="flex w-full overflow-x-auto bg-osu-gray/10 border border-osu-gray/20 scrollbar-hide">
            <TabsTrigger value="dashboard" className="flex-shrink-0 min-w-[100px] sm:min-w-[120px] whitespace-nowrap px-3 sm:px-4 text-xs sm:text-sm data-[state=active]:bg-osu-scarlet data-[state=active]:text-white text-osu-gray">Dashboard</TabsTrigger>
            <TabsTrigger value="actions" className="flex-shrink-0 min-w-[100px] sm:min-w-[120px] whitespace-nowrap px-3 sm:px-4 text-xs sm:text-sm data-[state=active]:bg-osu-scarlet data-[state=active]:text-white text-osu-gray">Quick Actions</TabsTrigger>
            <TabsTrigger value="network" className="flex-shrink-0 min-w-[100px] sm:min-w-[120px] whitespace-nowrap px-3 sm:px-4 text-xs sm:text-sm data-[state=active]:bg-osu-scarlet data-[state=active]:text-white text-osu-gray">Partner Network</TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-4">
            {user ? (
              <>
                {/* Verification Status */}
                <PartnerVerificationStatus />

                {/* Stats Overview */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="hover:shadow-lg transition-all duration-300 border-osu-gray/20 shadow-md">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-osu-scarlet/20 to-osu-gray/20 rounded-lg">
                          <Users className="h-5 w-5 text-osu-scarlet" />
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-osu-scarlet">{stats.totalReferrals}</div>
                          <div className="text-sm font-medium text-osu-gray">Total Referrals</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="hover:shadow-lg transition-all duration-300 border-osu-gray/20 shadow-md">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-osu-scarlet/20 to-osu-gray/20 rounded-lg">
                          <Clock className="h-5 w-5 text-osu-scarlet" />
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-osu-scarlet">{stats.activeReferrals}</div>
                          <div className="text-sm text-osu-gray">Active</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="hover:shadow-lg transition-all duration-300 border-osu-gray/20 shadow-md">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-osu-scarlet/20 to-osu-gray/20 rounded-lg">
                          <CheckCircle className="h-5 w-5 text-osu-scarlet" />
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-osu-scarlet">{stats.completedReferrals}</div>
                          <div className="text-sm text-osu-gray">Completed</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="hover:shadow-lg transition-all duration-300 border-osu-gray/20 shadow-md">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-osu-scarlet/20 to-osu-gray/20 rounded-lg">
                          <FileText className="h-5 w-5 text-osu-scarlet" />
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-osu-scarlet">{stats.resourcesAdded}</div>
                          <div className="text-sm text-osu-gray">Resources Added</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Impact Score */}
                <Card className="border-osu-gray/20 shadow-lg">
                  <CardHeader className="bg-gradient-to-r from-osu-scarlet/5 to-osu-gray/5 pb-3">
                    <CardTitle className="flex items-center gap-2 text-osu-scarlet text-lg">
                      <TrendingUp className="h-5 w-5" />
                      Community Impact Score
                    </CardTitle>
                    <CardDescription className="text-osu-gray text-sm">
                      Your organization's contribution to community outcomes
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold text-osu-scarlet">{stats.impactScore}/100</span>
                        <Badge variant={stats.impactScore >= 80 ? "default" : "secondary"} className="bg-osu-scarlet text-white">
                          {stats.impactScore >= 80 ? "Excellent" : "Good"}
                        </Badge>
                      </div>
                      <Progress value={stats.impactScore} className="h-2" />
                      <p className="text-xs text-osu-gray">
                        Based on referral success rates, resource quality, and community feedback
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card className="border-osu-gray/20 shadow-lg">
                <CardContent className="p-6 text-center">
                  <AlertCircle className="h-10 w-10 text-osu-gray mx-auto mb-3" />
                  <h3 className="text-lg font-semibold mb-2 text-osu-scarlet">Authentication Required</h3>
                  <p className="text-osu-gray mb-4 text-sm">
                    Please sign in to access your partner dashboard and track your impact.
                  </p>
                  <Button asChild className="bg-gradient-to-r from-osu-scarlet to-osu-gray hover:from-osu-scarlet/90 hover:to-osu-gray/90 text-white">
                    <NavLink to="/partner-signin">Sign In to Partner Portal</NavLink>
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Quick Actions Tab */}
          <TabsContent value="actions" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {quickActions.map((action, index) => {
                const IconComponent = action.icon;
                return (
                  <Card key={index} className="hover:shadow-lg transition-shadow border-osu-gray/20">
                    <CardHeader className="bg-gradient-to-r from-osu-scarlet/5 to-osu-gray/5 pb-3">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-gradient-to-br from-osu-scarlet/20 to-osu-gray/20 rounded-lg">
                          <IconComponent className="h-5 w-5 text-osu-scarlet" />
                        </div>
                        <div>
                          <CardTitle className="text-base text-osu-scarlet">{action.title}</CardTitle>
                          <CardDescription className="text-osu-gray text-sm">{action.description}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-2">
                      <Button asChild variant={action.variant} className="w-full bg-gradient-to-r from-osu-scarlet to-osu-gray hover:from-osu-scarlet/90 hover:to-osu-gray/90 text-white border-osu-gray">
                        <NavLink to={action.href}>
                          {action.title}
                        </NavLink>
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* Partner Network Tab */}
          <TabsContent value="network" className="space-y-4">
            {/* AI Partner Support Chatbot */}
            {!user && (
              <Card className="border-osu-scarlet/20 bg-gradient-to-r from-osu-scarlet/5 to-osu-gray/5 shadow-lg">
                <CardContent className="p-4 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <Bot className="h-8 w-8 text-osu-scarlet" />
                    <div>
                      <h3 className="font-semibold text-osu-scarlet mb-1">Try Our AI Partner Assistant</h3>
                      <p className="text-sm text-osu-gray mb-3">
                        Get instant answers about partnerships, referrals, and verification - no account required!
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button asChild size="sm" variant="outline">
                        <NavLink to="/partner-signin">Sign In</NavLink>
                      </Button>
                      <Button asChild size="sm" className="bg-gradient-to-r from-osu-scarlet to-osu-gray text-white">
                        <NavLink to="/partner-signup">Become a Partner</NavLink>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            <PartnerSupportChatbot />

            <div className="max-w-4xl mx-auto">
              <Card className="border-osu-gray/20 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-osu-scarlet/5 to-osu-gray/5 text-center pb-3">
                  <CardTitle className="text-osu-scarlet text-lg">Partner Benefits</CardTitle>
                  <CardDescription className="text-osu-gray text-sm">
                    Discover the advantages of being part of our partner network
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
                    {partnerBenefits.map((benefit, index) => {
                      const IconComponent = benefit.icon;
                      return (
                        <div key={index} className="flex flex-col items-center text-center gap-3">
                          <div className="p-3 bg-gradient-to-br from-osu-scarlet/20 to-osu-gray/20 rounded-lg">
                            <IconComponent className="h-5 w-5 text-osu-scarlet" />
                          </div>
                          <div>
                            <h3 className="font-semibold mb-1 text-osu-scarlet text-sm">{benefit.title}</h3>
                            <p className="text-xs text-osu-gray">{benefit.description}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-osu-gray/20 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-osu-scarlet/5 to-osu-gray/5 text-center pb-3">
                  <CardTitle className="text-osu-scarlet text-lg">Become a Partner</CardTitle>
                  <CardDescription className="text-osu-gray text-sm">
                    Join our network of organizations committed to supporting justice-impacted individuals
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 pt-4">
                  <div className="bg-osu-gray/10 p-4 rounded-lg border border-osu-gray/20 max-w-2xl mx-auto">
                    <h4 className="font-semibold mb-3 text-osu-scarlet text-center text-sm">Partnership Requirements</h4>
                    <ul className="text-xs text-osu-gray space-y-1 text-center list-none">
                      <li>• Commitment to serving justice-impacted individuals</li>
                      <li>• Demonstrated track record of community service</li>
                      <li>• Agreement to partnership guidelines and standards</li>
                      <li>• Regular participation in network activities</li>
                    </ul>
                  </div>
                  <div className="flex justify-center max-w-md mx-auto">
                    <Button asChild className="bg-gradient-to-r from-osu-scarlet to-osu-gray hover:from-osu-scarlet/90 hover:to-osu-gray/90 text-white">
                      <NavLink to="/partners/request">
                        Request Partnership
                      </NavLink>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

        </Tabs>
      </div>
    </main>
  );
};
export default Partners;
