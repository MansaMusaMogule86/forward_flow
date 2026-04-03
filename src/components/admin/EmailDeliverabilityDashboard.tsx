import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { Mail, TrendingUp, AlertTriangle, CheckCircle, Eye, MousePointer } from "lucide-react";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { toast } from "sonner";

interface EmailMetrics {
  totalSent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  complained: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
}

interface EmailEvent {
  id: string;
  email_id: string;
  recipient_email: string;
  event_type: string;
  email_type: string;
  event_data: any;
  created_at: string;
}

const COLORS = ['#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#6366F1'];

export default function EmailDeliverabilityDashboard() {
  const [metrics, setMetrics] = useState<EmailMetrics>({
    totalSent: 0,
    delivered: 0,
    opened: 0,
    clicked: 0,
    bounced: 0,
    complained: 0,
    deliveryRate: 0,
    openRate: 0,
    clickRate: 0,
  });
  const [recentEvents, setRecentEvents] = useState<EmailEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('7d');

  const loadEmailMetrics = useCallback(async () => {
    try {
      setLoading(true);

      const now = new Date();
      const timeRanges = {
        '24h': new Date(now.getTime() - 24 * 60 * 60 * 1000),
        '7d': new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        '30d': new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      };

      const startDate = timeRanges[timeRange].toISOString();

      // Fetch all email events
      const { data: events, error } = await supabase
        .from('email_events')
        .select('*')
        .gte('created_at', startDate)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Calculate metrics
      const eventsByType = events?.reduce((acc, event) => {
        acc[event.event_type] = (acc[event.event_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      // Count unique emails for open/click rates
      const uniqueEmails = new Set(events?.map(e => e.email_id) || []);
      const totalSent = uniqueEmails.size;
      
      const delivered = eventsByType['delivered'] || 0;
      const opened = eventsByType['opened'] || 0;
      const clicked = eventsByType['clicked'] || 0;
      const bounced = eventsByType['bounced'] || 0;
      const complained = eventsByType['complained'] || 0;

      const deliveryRate = totalSent > 0 ? (delivered / totalSent) * 100 : 0;
      const openRate = delivered > 0 ? (opened / delivered) * 100 : 0;
      const clickRate = opened > 0 ? (clicked / opened) * 100 : 0;

      setMetrics({
        totalSent,
        delivered,
        opened,
        clicked,
        bounced,
        complained,
        deliveryRate,
        openRate,
        clickRate,
      });

      setRecentEvents(events?.slice(0, 50) || []);
    } catch (error: any) {
      console.error('Error loading email metrics:', error);
      toast.error('Failed to load email metrics');
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    void loadEmailMetrics();
  }, [loadEmailMetrics]);

  const getEmailTypeData = () => {
    const typeCount = recentEvents.reduce((acc, event) => {
      acc[event.email_type] = (acc[event.email_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(typeCount).map(([name, value]) => ({ name, value }));
  };

  const getEventTypeData = () => {
    const eventCount = recentEvents.reduce((acc, event) => {
      acc[event.event_type] = (acc[event.event_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(eventCount).map(([name, value]) => ({ name, value }));
  };

  const getDailyTrends = () => {
    const dailyData: Record<string, Record<string, number>> = {};
    
    recentEvents.forEach(event => {
      const date = new Date(event.created_at).toLocaleDateString();
      if (!dailyData[date]) {
        dailyData[date] = { delivered: 0, opened: 0, clicked: 0, bounced: 0 };
      }
      dailyData[date][event.event_type] = (dailyData[date][event.event_type] || 0) + 1;
    });

    return Object.entries(dailyData)
      .map(([date, counts]) => ({ date, ...counts }))
      .slice(-14); // Last 14 days
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading Email Metrics...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">Email Deliverability Dashboard</h2>
          <p className="text-muted-foreground">Track email performance and engagement metrics</p>
        </div>
        <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as any)}>
          <TabsList>
            <TabsTrigger value="24h">24 Hours</TabsTrigger>
            <TabsTrigger value="7d">7 Days</TabsTrigger>
            <TabsTrigger value="30d">30 Days</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Sent</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalSent}</div>
            <p className="text-xs text-muted-foreground">Unique emails sent</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Delivery Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.deliveryRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">{metrics.delivered} delivered</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Open Rate</CardTitle>
            <Eye className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.openRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">{metrics.opened} opens</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Click Rate</CardTitle>
            <MousePointer className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.clickRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">{metrics.clicked} clicks</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Email Activity</CardTitle>
            <CardDescription>Delivered, opened, and clicked over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={getDailyTrends()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="delivered" stroke="#10B981" strokeWidth={2} />
                <Line type="monotone" dataKey="opened" stroke="#06B6D4" strokeWidth={2} />
                <Line type="monotone" dataKey="clicked" stroke="#8B5CF6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Email Types Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Emails by Type</CardTitle>
            <CardDescription>Distribution of email categories</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={getEmailTypeData()}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => entry.name}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {getEmailTypeData().map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Event Types */}
        <Card>
          <CardHeader>
            <CardTitle>Event Distribution</CardTitle>
            <CardDescription>Breakdown of all email events</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={getEventTypeData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#8B5CF6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Issues Alert */}
        <Card className="border-orange-200 bg-orange-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              Issues & Bounces
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Bounced Emails</span>
              <span className="text-2xl font-bold text-orange-600">{metrics.bounced}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Spam Complaints</span>
              <span className="text-2xl font-bold text-red-600">{metrics.complained}</span>
            </div>
            {(metrics.bounced > 0 || metrics.complained > 0) && (
              <p className="text-xs text-muted-foreground mt-4">
                Review bounced emails and complaints to maintain deliverability reputation
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Events Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Email Events</CardTitle>
          <CardDescription>Last 50 email activities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Time</th>
                  <th className="text-left p-2">Recipient</th>
                  <th className="text-left p-2">Type</th>
                  <th className="text-left p-2">Event</th>
                  <th className="text-left p-2">Email Type</th>
                </tr>
              </thead>
              <tbody>
                {recentEvents.slice(0, 10).map((event) => (
                  <tr key={event.id} className="border-b hover:bg-muted/50">
                    <td className="p-2">{new Date(event.created_at).toLocaleString()}</td>
                    <td className="p-2 truncate max-w-[200px]">{event.recipient_email}</td>
                    <td className="p-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        event.event_type === 'delivered' ? 'bg-green-100 text-green-700' :
                        event.event_type === 'opened' ? 'bg-blue-100 text-blue-700' :
                        event.event_type === 'clicked' ? 'bg-purple-100 text-purple-700' :
                        event.event_type === 'bounced' ? 'bg-orange-100 text-orange-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {event.event_type}
                      </span>
                    </td>
                    <td className="p-2">
                      <span className="px-2 py-1 rounded text-xs bg-muted">
                        {event.email_type}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
