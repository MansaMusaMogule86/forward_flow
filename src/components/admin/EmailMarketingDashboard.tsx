import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Mail, 
  Users, 
  TrendingUp, 
  Send, 
  Eye,
  Download,
  Plus,
  Calendar
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { EmailCampaignForm } from "./EmailCampaignForm";

import { ReminderEmailManager } from "./ReminderEmailManager";
import { AutomatedEmailMonitor } from "./AutomatedEmailMonitor";
import { EmailTemplateEditor } from "./EmailTemplateEditor";
import { EmailQueueMonitor } from "./EmailQueueMonitor";
import { TestEmailSender } from "./TestEmailSender";

interface NewsletterSubscription {
  id: string;
  email: string;
  name: string | null;
  status: string;
  subscription_source: string;
  subscribed_at: string;
  created_at: string;
}

interface EmailCampaign {
  id: string;
  name: string;
  subject: string;
  status: string;
  scheduled_at: string | null;
  sent_at: string | null;
  total_recipients: number;
  sent_count: number;
  open_count: number;
  click_count: number;
  created_at: string;
}

interface EmailStats {
  totalSubscribers: number;
  activeSubscribers: number;
  recentSignups: number;
  totalCampaigns: number;
}

export const EmailMarketingDashboard = () => {
  const [subscriptions, setSubscriptions] = useState<NewsletterSubscription[]>([]);
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [stats, setStats] = useState<EmailStats>({
    totalSubscribers: 0,
    activeSubscribers: 0,
    recentSignups: 0,
    totalCampaigns: 0
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadEmailData = useCallback(async () => {
    try {
      setLoading(true);

      // Load newsletter subscriptions
      const { data: subscriptionsData, error: subscriptionsError } = await supabase
        .from('newsletter_subscriptions')
        .select('*')
        .order('created_at', { ascending: false });

      if (subscriptionsError) throw subscriptionsError;

      // Load email campaigns
      const { data: campaignsData, error: campaignsError } = await supabase
        .from('email_campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (campaignsError) throw campaignsError;

      setSubscriptions(subscriptionsData || []);
      setCampaigns(campaignsData || []);

      // Calculate stats
      const totalSubscribers = subscriptionsData?.length || 0;
      const activeSubscribers = subscriptionsData?.filter(s => s.status === 'active').length || 0;
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const recentSignups = subscriptionsData?.filter(s => 
        new Date(s.created_at) > weekAgo
      ).length || 0;

      setStats({
        totalSubscribers,
        activeSubscribers,
        recentSignups,
        totalCampaigns: campaignsData?.length || 0
      });

    } catch (error: any) {
      console.error('Error loading email data:', error);
      toast({
        title: "Error",
        description: "Failed to load email marketing data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadEmailData();
  }, [loadEmailData]);

  const exportSubscribers = async () => {
    try {
      const csvContent = [
        ['Email', 'Name', 'Status', 'Source', 'Subscribed Date'].join(','),
        ...subscriptions.map(sub => [
          sub.email,
          sub.name || '',
          sub.status,
          sub.subscription_source,
          new Date(sub.subscribed_at).toLocaleDateString()
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `newsletter-subscribers-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: "Export Complete",
        description: "Subscriber list exported successfully",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export subscriber list",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-foreground">Email Marketing</h2>
        <div className="flex gap-2">
          <EmailCampaignForm onSuccess={loadEmailData} />
          <Button onClick={exportSubscribers} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export Subscribers
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Subscribers</p>
                <p className="text-2xl font-bold text-foreground">{stats.totalSubscribers}</p>
              </div>
              <Users className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Subscribers</p>
                <p className="text-2xl font-bold text-foreground">{stats.activeSubscribers}</p>
              </div>
              <Mail className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">New This Week</p>
                <p className="text-2xl font-bold text-foreground">{stats.recentSignups}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Campaigns</p>
                <p className="text-2xl font-bold text-foreground">{stats.totalCampaigns}</p>
              </div>
              <Send className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Subscribers and Campaigns */}
      <Tabs defaultValue="subscribers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="subscribers">Subscribers</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="reminders">📧 Reminders</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="subscribers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Newsletter Subscribers ({subscriptions.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 font-medium">Email</th>
                      <th className="text-left p-2 font-medium">Name</th>
                      <th className="text-left p-2 font-medium">Status</th>
                      <th className="text-left p-2 font-medium">Source</th>
                      <th className="text-left p-2 font-medium">Subscribed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscriptions.slice(0, 20).map((sub) => (
                      <tr key={sub.id} className="border-b hover:bg-muted/50">
                        <td className="p-2 font-mono text-sm">{sub.email}</td>
                        <td className="p-2">{sub.name || '-'}</td>
                        <td className="p-2">
                          <Badge 
                            variant={sub.status === 'active' ? 'default' : 'secondary'}
                            className={sub.status === 'active' ? 'bg-green-100 text-green-800' : ''}
                          >
                            {sub.status}
                          </Badge>
                        </td>
                        <td className="p-2 capitalize">{sub.subscription_source}</td>
                        <td className="p-2 text-muted-foreground">
                          {new Date(sub.subscribed_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {subscriptions.length > 20 && (
                  <p className="text-center text-muted-foreground mt-4">
                    Showing 20 of {subscriptions.length} subscribers
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="w-5 h-5" />
                Email Campaigns ({campaigns.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {campaigns.length === 0 ? (
                <div className="text-center py-8">
                  <Mail className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No email campaigns created yet</p>
                  <p className="text-sm text-muted-foreground/80 mt-2">
                    Create your first campaign to engage with subscribers
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2 font-medium">Campaign Name</th>
                        <th className="text-left p-2 font-medium">Subject</th>
                        <th className="text-left p-2 font-medium">Status</th>
                        <th className="text-left p-2 font-medium">Recipients</th>
                        <th className="text-left p-2 font-medium">Success Rate</th>
                        <th className="text-left p-2 font-medium">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {campaigns.map((campaign) => (
                        <tr key={campaign.id} className="border-b hover:bg-muted/50">
                          <td className="p-2 font-medium">{campaign.name}</td>
                          <td className="p-2">{campaign.subject}</td>
                          <td className="p-2">
                            <Badge 
                              variant={campaign.status === 'sent' ? 'default' : 'secondary'}
                              className={campaign.status === 'sent' ? 'bg-green-100 text-green-800' : ''}
                            >
                              {campaign.status}
                            </Badge>
                          </td>
                          <td className="p-2">{campaign.total_recipients}</td>
                          <td className="p-2">
                            {campaign.total_recipients > 0 
                              ? `${Math.round((campaign.sent_count / campaign.total_recipients) * 100)}%`
                              : '-'
                            }
                          </td>
                          <td className="p-2 text-muted-foreground">
                            {campaign.sent_at 
                              ? new Date(campaign.sent_at).toLocaleDateString()
                              : new Date(campaign.created_at).toLocaleDateString()
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reminders" className="space-y-4">
          <ReminderEmailManager />
          <EmailQueueMonitor />
          <AutomatedEmailMonitor />
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <EmailTemplateEditor />
          <TestEmailSender />
        </TabsContent>

      </Tabs>
    </div>
  );
};
