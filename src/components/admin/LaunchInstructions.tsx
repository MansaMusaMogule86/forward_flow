import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, ExternalLink, Globe, Settings, Shield } from 'lucide-react';

export const LaunchInstructions = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Globe className="h-5 w-5" />
            <span>Final Launch Steps</span>
          </CardTitle>
          <CardDescription>
            Complete these manual configuration steps in Supabase to finish your launch preparation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            
            {/* Step 1: Leaked Password Protection */}
            <div className="flex items-start space-x-3 p-4 border rounded-lg border-red-200 bg-red-50">
              <Shield className="h-5 w-5 text-red-500 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-red-800">🔐 Enable Leaked Password Protection (CRITICAL)</h4>
                <p className="text-sm text-red-700 mb-2">
                  This prevents users from signing up with passwords that have been exposed in data breaches.
                </p>
                <div className="text-xs bg-white p-3 rounded border border-red-200 mb-2 space-y-1">
                  <p><strong>Steps:</strong></p>
                  <ol className="list-decimal list-inside space-y-1 text-red-700">
                    <li>Go to Supabase Dashboard → Authentication → Settings</li>
                    <li>Find "Leaked Password Protection" section</li>
                    <li>Enable "Warning Mode" first for monitoring</li>
                    <li>After 1 week, enable "Strict Mode" to block leaked passwords</li>
                  </ol>
                </div>
                <Badge variant="destructive">
                  Security Critical - Manual Step Required
                </Badge>
              </div>
            </div>

            {/* Step 2: URL Configuration */}
            <div className="flex items-start space-x-3 p-4 border rounded-lg">
              <Settings className="h-5 w-5 text-blue-500 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium">Configure Site & Redirect URLs</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Set your production domain in Authentication → URL Configuration
                </p>
                <div className="text-xs space-y-1">
                  <p><strong>Site URL:</strong> Your production domain (e.g., https://yourdomain.com)</p>
                  <p><strong>Redirect URLs:</strong> Add both production and preview URLs</p>
                </div>
                <Badge variant="outline" className="text-blue-600 border-blue-200 mt-2">
                  Recommended
                </Badge>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </div>

            {/* Step 3: Deploy */}
            <div className="flex items-start space-x-3 p-4 border rounded-lg bg-green-50">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-green-800">Ready to Deploy</h4>
                <p className="text-sm text-green-700 mb-2">
                  Your application is ready for production deployment!
                </p>
                <ul className="text-xs text-green-700 space-y-1">
                  <li>✅ Security policies configured</li>
                  <li>✅ AI services operational</li>
                  <li>✅ Database optimized</li>
                  <li>✅ Email service configured</li>
                  <li>✅ Admin account ready</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Alert>
        <Globe className="h-4 w-4" />
        <AlertDescription>
          <strong>Next Steps:</strong> After completing the manual configuration above, your Forward Focus Elevation platform will be production-ready. 
          The comprehensive security system, AI companions, and resource management features are all operational and ready to serve your community.
        </AlertDescription>
      </Alert>
    </div>
  );
};