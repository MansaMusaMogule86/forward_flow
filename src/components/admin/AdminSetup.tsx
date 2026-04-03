import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, CheckCircle, AlertTriangle } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const AdminSetup = () => {
  const [adminEmail, setAdminEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [adminExists, setAdminExists] = useState<boolean | null>(null);

  const checkAdminExists = async () => {
    try {
      const { data } = await supabase.rpc('check_admin_exists');
      setAdminExists(data || false);
      return data || false;
    } catch (error) {
      console.error('Error checking admin exists:', error);
      return false;
    }
  };

  React.useEffect(() => {
    checkAdminExists();
  }, []);

  const createFirstAdmin = async () => {
    if (!adminEmail.trim()) {
      toast.error('Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      // Create admin role for the user  
      const { error } = await supabase.rpc('create_first_admin_user' as any, {
        admin_email: adminEmail
      });

      if (error) {
        throw error;
      }

      toast.success('Admin account created successfully!');
      setAdminEmail('');
      await checkAdminExists();
    } catch (error: any) {
      console.error('Error creating admin:', error);
      toast.error(error.message || 'Failed to create admin account');
    } finally {
      setLoading(false);
    }
  };

  if (adminExists === null) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Checking admin status...</p>
        </CardContent>
      </Card>
    );
  }

  if (adminExists) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <CardTitle className="text-green-800">Admin Account Ready</CardTitle>
          </div>
          <CardDescription className="text-green-700">
            An administrator account has been configured for this application.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-green-700">
            Your application has at least one admin user and is ready for administrative functions.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Shield className="h-5 w-5 text-orange-600" />
          <CardTitle className="text-orange-800">Admin Account Setup Required</CardTitle>
        </div>
        <CardDescription className="text-orange-700">
          Create the first administrator account to manage the application.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            The user must register a regular account first, then enter their email below to grant admin privileges.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label htmlFor="adminEmail">Admin User Email</Label>
          <Input
            id="adminEmail"
            type="email"
            value={adminEmail}
            onChange={(e) => setAdminEmail(e.target.value)}
            placeholder="user@example.com"
            className="bg-white"
          />
        </div>

        <Button
          onClick={createFirstAdmin}
          disabled={loading || !adminEmail.trim()}
          className="w-full"
        >
          {loading ? 'Creating Admin...' : 'Create First Admin'}
        </Button>

        <div className="text-xs text-orange-700 space-y-1">
          <p><strong>Steps:</strong></p>
          <ol className="list-decimal list-inside space-y-1 ml-2">
            <li>User registers a normal account via /auth</li>
            <li>Enter their email address above</li>
            <li>Click "Create First Admin" to grant admin privileges</li>
            <li>User can now access admin functions</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
};