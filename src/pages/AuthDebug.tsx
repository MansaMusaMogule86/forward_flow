import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, XCircle, Loader2, ShieldAlert } from "lucide-react";
import AuthLayout from "@/components/layout/AuthLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminCheck } from "@/hooks/useAdminCheck";

interface TestResult {
  name: string;
  status: "pending" | "success" | "error";
  message: string;
  details?: any;
}

const AuthDebug = () => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isChecking: adminLoading } = useAdminCheck(user);
  const isDevelopment = import.meta.env.DEV;

  const [tests, setTests] = useState<TestResult[]>([
    { name: "Environment Variables", status: "pending", message: "Checking..." },
    { name: "Supabase Connection", status: "pending", message: "Checking..." },
    { name: "Auth Service", status: "pending", message: "Checking..." },
    { name: "Sign In Test", status: "pending", message: "Checking..." },
  ]);

  useEffect(() => {
    runDiagnostics();
  }, []);

  const runDiagnostics = async () => {
    // Test 1: Environment Variables
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    updateTest(0, {
      status: supabaseUrl && supabaseKey ? "success" : "error",
      message: supabaseUrl && supabaseKey
        ? "Environment variables loaded correctly"
        : "Missing environment variables",
      details: {
        url: supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : "MISSING",
        key: supabaseKey ? `${supabaseKey.substring(0, 20)}...` : "MISSING",
        origin: window.location.origin
      }
    });

    // Test 2: Supabase Connection (REST endpoint)
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/`, {
        method: 'HEAD',
        headers: {
          'apikey': supabaseKey,
        }
      });

      updateTest(1, {
        status: response.ok ? "success" : "error",
        message: response.ok
          ? `Connection successful (${response.status})`
          : `Connection failed (${response.status})`,
        details: {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries())
        }
      });
    } catch (error: any) {
      updateTest(1, {
        status: "error",
        message: "Network error - cannot reach Supabase",
        details: {
          error: error.message,
          name: error.name,
          stack: error.stack?.split('\n').slice(0, 3).join('\n')
        }
      });
    }

    // Test 3: Auth Service
    try {
      const response = await fetch(`${supabaseUrl}/auth/v1/settings`, {
        method: 'GET',
        headers: {
          'apikey': supabaseKey,
        }
      });

      const data = await response.json();

      updateTest(2, {
        status: response.ok ? "success" : "error",
        message: response.ok
          ? "Auth service is accessible"
          : `Auth service error (${response.status})`,
        details: {
          status: response.status,
          autoconfirm: data.autoconfirm,
          external: data.external,
          disable_signup: data.disable_signup
        }
      });
    } catch (error: any) {
      updateTest(2, {
        status: "error",
        message: "Cannot reach auth service",
        details: {
          error: error.message,
          name: error.name
        }
      });
    }

    // Test 4: Sign In Test (dry run - test SDK directly)
    try {
      // Try to call signInWithPassword with invalid credentials to test connectivity
      const { error } = await supabase.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'invalid-password-for-testing'
      });

      // We expect this to fail with "Invalid login credentials" which means the connection works
      const isConnectivityError = error?.message?.toLowerCase().includes('fetch') ||
        error?.message?.toLowerCase().includes('network') ||
        error?.message?.toLowerCase().includes('cors');

      updateTest(3, {
        status: isConnectivityError ? "error" : "success",
        message: isConnectivityError
          ? "SDK cannot reach auth service"
          : "SDK connection working (credentials rejected as expected)",
        details: {
          errorMessage: error?.message || 'No error',
          errorName: error?.name || 'Unknown',
          isConnectivityError
        }
      });
    } catch (error: any) {
      updateTest(3, {
        status: "error",
        message: "SDK threw an exception",
        details: {
          error: error.message,
          name: error.name,
          stack: error.stack?.split('\n').slice(0, 3).join('\n')
        }
      });
    }
  };

  const updateTest = (index: number, update: Partial<TestResult>) => {
    setTests(prev => prev.map((test, i) =>
      i === index ? { ...test, ...update } : test
    ));
  };

  const getStatusIcon = (status: TestResult["status"]) => {
    switch (status) {
      case "success":
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case "error":
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />;
    }
  };

  const allTestsComplete = tests.every(t => t.status !== "pending");
  const hasErrors = tests.some(t => t.status === "error");

  // Restrict access in production to admins only
  if (!isDevelopment && !authLoading && !adminLoading && !isAdmin) {
    return (
      <AuthLayout>
        <div className="col-span-full">
          <Card className="max-w-md mx-auto border-destructive/50">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <ShieldAlert className="h-12 w-12 text-destructive" />
              </div>
              <CardTitle className="text-xl font-bold text-destructive">Access Restricted</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                Diagnostics are only available to administrators in production environments.
              </p>
              <Button onClick={() => window.location.href = '/auth'} className="w-full">
                Back to Login
              </Button>
            </CardContent>
          </Card>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="col-span-full">
        <Card className="max-w-3xl mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Authentication Diagnostics</CardTitle>
            <p className="text-sm text-muted-foreground">
              Testing connectivity and configuration for authentication services
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {allTestsComplete && (
              <Alert variant={hasErrors ? "destructive" : "default"}>
                <AlertDescription>
                  {hasErrors
                    ? "⚠️ Issues detected. Review the failed tests below and check your network connection."
                    : "✅ All tests passed! Authentication should be working correctly."}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              {tests.map((test, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {getStatusIcon(test.status)}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm">{test.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{test.message}</p>
                      {test.details && (
                        <details className="mt-2">
                          <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                            View technical details
                          </summary>
                          <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto">
                            {JSON.stringify(test.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <Button onClick={runDiagnostics} variant="outline">
                Run Tests Again
              </Button>
              <Button onClick={() => window.location.href = '/auth'}>
                Back to Sign In
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AuthLayout>
  );
};

export default AuthDebug;
