import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, CheckCircle, AlertTriangle, ArrowLeft } from 'lucide-react';
import { toast } from "sonner";

const SetupAdmin = () => {
  const navigate = useNavigate();
  const [adminEmail, setAdminEmail] = useState('');
  const [setupKey, setSetupKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [adminExists, setAdminExists] = useState<boolean | null>(null);
  const [checkingAdmin, setCheckingAdmin] = useState(true);

    // No local set-up key check for production to prevent secret leakage.
    // The Edge Function 'validate-auth-security' handles the secure comparison.

  const checkAdminExists = async () => {
    try {
      const { data } = await supabase.rpc('check_admin_exists');
      setAdminExists(data || false);
      return data || false;
    } catch (error) {
      console.error('Error checking admin exists:', error);
      return false;
    } finally {
      setCheckingAdmin(false);
    }
  };

  useEffect(() => {
    document.title = "Admin Setup | Forward Focus Elevation";
    checkAdminExists();
  }, []);

  const createFirstAdmin = async () => {
    if (!adminEmail.trim()) {
      toast.error('Please enter a valid email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(adminEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      // Use secure Edge Function for admin setup in production
      const { data, error } = await supabase.functions.invoke('validate-auth-security', {
        body: {
          action: 'create-first-admin',
          email: adminEmail.toLowerCase().trim(),
          setupKey: setupKey
        }
      });

      if (error) {
        throw error;
      }

      const result = data as { success: boolean; message: string };
      
      if (result.success) {
        toast.success('Admin account created successfully! You can now sign in.');
        setAdminEmail('');
        await checkAdminExists();
        
        // Redirect to auth page after 2 seconds
        setTimeout(() => {
          navigate('/auth');
        }, 2000);
      } else {
        toast.error(result.message || 'Failed to create admin account');
      }
    } catch (error: any) {
      console.error('Error creating admin:', error);
      toast.error(error.message || 'Failed to create admin account');
    } finally {
      setLoading(false);
    }
  };

  if (checkingAdmin) {
    return (
      <main className="container py-12 flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-2 text-sm text-muted-foreground">Checking admin status...</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (adminExists) {
    return (
      <main className="container py-12 flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md border-green-200 bg-green-50">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <CardTitle className="text-green-800">Admin Account Ready</CardTitle>
            </div>
            <CardDescription className="text-green-700">
              An administrator account has already been configured.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-green-700">
              This application already has an admin user. If you need access, please contact the existing administrator.
            </p>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => navigate('/')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="container py-12 flex items-center justify-center min-h-screen">
      <Card className="w-full max-w-md border-orange-200 bg-orange-50">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-orange-600" />
            <CardTitle className="text-orange-800">First Admin Setup</CardTitle>
          </div>
          <CardDescription className="text-orange-700">
            Create the first administrator account for this application.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Important:</strong> You must first register a regular account at <button onClick={() => navigate('/auth')} className="underline font-medium">/auth</button>, then return here to grant admin privileges.
            </AlertDescription>
          </Alert>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="adminEmail">Admin User Email</Label>
              <Input
                id="adminEmail"
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="user@example.com"
                className="bg-white"
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Enter the email address of the account you just registered
              </p>
            </div>

              <div className="space-y-2">
                <Label htmlFor="setupKey">Setup Authorization Key</Label>
                <Input
                  id="setupKey"
                  type="password"
                  value={setupKey}
                  onChange={(e) => setSetupKey(e.target.value)}
                  placeholder="Enter security key"
                  className="bg-white"
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  Required for initial administrator setup
                </p>
              </div>
          </div>
          
          <Button 
            onClick={createFirstAdmin} 
            disabled={loading || !adminEmail.trim() || !setupKey}
            className="w-full"
          >
            {loading ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                Creating Admin...
              </>
            ) : (
              'Create First Admin'
            )}
          </Button>
          
          <div className="text-xs text-orange-700 bg-orange-100 p-3 rounded-md space-y-2">
            <p className="font-semibold">Setup Steps:</p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Register a new account at <button onClick={() => navigate('/auth')} className="underline">/auth</button></li>
              <li>Return to this page</li>
              <li>Enter the email you registered with</li>
              <li>Click "Create First Admin"</li>
              <li>Sign in with your account - you now have admin access!</li>
            </ol>
          </div>

          <Button 
            variant="ghost" 
            className="w-full"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </CardContent>
      </Card>
    </main>
  );
};

export default SetupAdmin;
