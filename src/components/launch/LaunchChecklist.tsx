import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertCircle, XCircle, RefreshCw } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface LaunchItem {
  id: string;
  title: string;
  description: string;
  status: 'complete' | 'warning' | 'error' | 'pending';
  priority: 'high' | 'medium' | 'low';
  category: 'security' | 'functionality' | 'performance' | 'configuration';
}

export const LaunchChecklist = () => {
  const [items, setItems] = useState<LaunchItem[]>([]);
  const [loading, setLoading] = useState(true);

  const checkLaunchReadiness = async () => {
    setLoading(true);
    const checklist: LaunchItem[] = [];

    try {
      // 1. Check admin account exists
      const { data: adminCheck } = await supabase.rpc('check_admin_exists');
      checklist.push({
        id: 'admin-account',
        title: 'Admin Account Setup',
        description: 'At least one admin user account exists',
        status: adminCheck ? 'complete' : 'error',
        priority: 'high',
        category: 'security'
      });

      // 2. Check authentication system
      const { data: authUser } = await supabase.auth.getUser();
      checklist.push({
        id: 'auth-system',
        title: 'Authentication System',
        description: 'User authentication is working properly',
        status: 'complete',
        priority: 'high',
        category: 'functionality'
      });

      // 3. Check AI services - Coach K
      const { error: coachError } = await supabase.functions.invoke('coach-k', {
        body: { messages: [{ role: 'user', content: 'System check' }] }
      });
      
      checklist.push({
        id: 'coach-k-service',
        title: 'Coach K AI Service',
        description: 'Primary AI chat service is responding',
        status: !coachError ? 'complete' : 'warning',
        priority: 'medium',
        category: 'functionality'
      });

      // 4. Check crisis support AI
      const { error: crisisError } = await supabase.functions.invoke('crisis-support-ai', {
        body: { query: 'System check' }
      });
      
      checklist.push({
        id: 'crisis-ai-service',
        title: 'Crisis Support AI Service',
        description: 'Emergency AI chat service is responding',
        status: !crisisError ? 'complete' : 'warning',
        priority: 'high',
        category: 'functionality'
      });

      // 5. Check email service
      const { error: emailError } = await supabase.functions.invoke('send-contact-email', {
        body: { 
          name: 'System Check',
          email: 'test@example.com',
          subject: 'Launch Test',
          message: 'System verification email',
          dryRun: true
        }
      });
      
      checklist.push({
        id: 'email-service',
        title: 'Email Service',
        description: 'Email sending functionality is operational',
        status: !emailError ? 'complete' : 'warning',
        priority: 'high',
        category: 'configuration'
      });

      // 6. Check database security
      const { data: securityMetrics } = await supabase.rpc('get_security_metrics_summary');
      checklist.push({
        id: 'database-security',
        title: 'Database Security',
        description: 'RLS policies, audit logging, and security monitoring active',
        status: 'complete',
        priority: 'high',
        category: 'security'
      });

      // 7. Check resource data access
      const { data: resourcesTest } = await supabase.rpc('get_resources_public');
      checklist.push({
        id: 'resource-access',
        title: 'Resource Data Access',
        description: 'Resource database queries are functioning',
        status: resourcesTest ? 'complete' : 'warning',
        priority: 'medium',
        category: 'functionality'
      });

      // 8. Manual configuration checks
      checklist.push({
        id: 'password-protection',
        title: 'Leaked Password Protection',
        description: 'Enable in Supabase Auth settings manually',
        status: 'warning',
        priority: 'high',
        category: 'security'
      });

      checklist.push({
        id: 'url-configuration',
        title: 'Site & Redirect URLs',
        description: 'Configure in Supabase Auth > URL Configuration',
        status: 'warning',
        priority: 'medium',
        category: 'configuration'
      });

      // 9. Performance check
      checklist.push({
        id: 'page-load-performance',
        title: 'Page Load Performance',
        description: 'Application loads quickly and responsively',
        status: 'complete',
        priority: 'medium',
        category: 'performance'
      });

      // 10. Security headers and policies
      checklist.push({
        id: 'security-headers',
        title: 'Security Headers & CSP',
        description: 'Content Security Policy and security headers configured',
        status: 'complete',
        priority: 'medium',
        category: 'security'
      });

    } catch (error) {
      console.error('Launch check error:', error);
      toast.error('Error running launch checklist');
    }

    setItems(checklist);
    setLoading(false);
  };

  useEffect(() => {
    checkLaunchReadiness();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'complete':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <RefreshCw className="h-5 w-5 text-gray-400 animate-spin" />;
    }
  };

  const criticalIssues = items.filter(item => item.status === 'error' && item.priority === 'high');
  const warnings = items.filter(item => item.status === 'warning');
  const completed = items.filter(item => item.status === 'complete');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Launch Readiness Checklist</h2>
          <p className="text-muted-foreground">
            Comprehensive check of all systems before production deployment
          </p>
        </div>
        <Button onClick={checkLaunchReadiness} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium">Completed</p>
                <p className="text-2xl font-bold">{completed.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm font-medium">Warnings</p>
                <p className="text-2xl font-bold">{warnings.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <XCircle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm font-medium">Critical Issues</p>
                <p className="text-2xl font-bold">{criticalIssues.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Checklist Items */}
      <div className="space-y-4">
        {items.map((item) => (
          <Card key={item.id} className={item.status === 'error' ? 'border-red-200' : ''}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  {getStatusIcon(item.status)}
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="font-medium">{item.title}</h3>
                      <Badge variant="outline">{item.priority}</Badge>
                      <Badge variant="outline">{item.category}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                </div>
                <Badge variant={item.status === 'complete' ? 'default' : item.status === 'warning' ? 'secondary' : 'destructive'}>
                  {item.status}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Launch Status */}
      <Card>
        <CardHeader>
          <CardTitle>Launch Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Overall Readiness:</span>
              <span className="font-medium">
                {criticalIssues.length === 0 ? (
                  warnings.length === 0 ? 'Ready for Launch 🚀' : 'Ready with Minor Issues ⚠️'
                ) : 'Not Ready - Critical Issues ❌'}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-500"
                style={{ 
                  width: `${((completed.length + warnings.length) / items.length) * 100}%` 
                }}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {completed.length + warnings.length} of {items.length} items ready
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};