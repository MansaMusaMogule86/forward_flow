import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useAnonymousSession } from "@/hooks/useAnonymousSession";
import { useAuthSecurity } from "@/hooks/useAuthSecurity";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { Navigate, Link } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import communityImage from "@/assets/images/community/families-healing.jpg";
import AuthLayout from "@/components/layout/AuthLayout";
import { supabase } from "@/integrations/supabase/client";
import { PasswordStrengthIndicator } from "@/components/security/PasswordStrengthIndicator";
import { SimpleCaptcha } from "@/components/security/SimpleCaptcha";
import { RateLimitWarning } from "@/components/security/RateLimitWarning";
import { authFormSchema, registrationFormSchema } from "@/lib/validationSchemas";

type OAuthProvider = "google" | "apple";

const Auth = () => {
  const { user, signIn, signUp, signInWithGoogle, signInWithApple, loading } = useAuth();
  const { rateLimitStatus, checkRateLimit, recordLoginAttempt } = useAuthSecurity();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const { transferToUser } = useAnonymousSession();

  useEffect(() => {
    document.title = isLogin ? "Sign In | Forward Focus Elevation" : "Sign Up | Forward Focus Elevation";
  }, [isLogin]);

  // Redirect if already authenticated and transfer anonymous session if exists
  useEffect(() => {
    if (user && !loading) {
      // Transfer anonymous session to user account
      transferToUser(user.id).then((result) => {
        if (result.success && result.conversationHistory) {
          toast({
            title: "Welcome back!",
            description: "Your trial progress has been restored.",
          });
        }
      });
    }
  }, [user, loading, transferToUser]);

  // Redirect if already authenticated
  if (user && !loading) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    // Check rate limit before proceeding
    const status = await checkRateLimit(email);

    if (status.isLockedOut) {
      toast({
        title: "Account Locked",
        description: "Your account has been temporarily locked due to too many failed attempts.",
        variant: "destructive",
      });
      return;
    }

    if (status.isRateLimited) {
      toast({
        title: "Too Many Attempts",
        description: "Please wait before trying again.",
        variant: "destructive",
      });
      return;
    }

    // Require CAPTCHA if threshold reached
    if (status.requiresCaptcha && !captchaVerified) {
      toast({
        title: "Security Verification Required",
        description: "Please complete the security verification below.",
        variant: "destructive",
      });
      return;
    }

    // Validate email and password for signup using registration schema
    if (!isLogin) {
      try {
        registrationFormSchema.parse({ email, password, confirmPassword });
      } catch (error: any) {
        const firstError = error.errors?.[0];
        const errorMessage = firstError?.message || "Validation requirements not met";
        const errorTitle = firstError?.path?.includes('password')
          ? "Password Requirements Not Met"
          : firstError?.path?.includes('confirmPassword')
            ? "Password Mismatch"
            : "Validation Error";

        toast({
          title: errorTitle,
          description: errorMessage,
          variant: "destructive",
        });
        return;
      }
    }

    setAuthLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          // Record failed login attempt
          await recordLoginAttempt(email, false, error.message);

          const errorMsg = error.message || "An unknown error occurred";
          const isNetworkError = errorMsg.toLowerCase().includes('fetch') ||
            errorMsg.toLowerCase().includes('network') ||
            errorMsg.toLowerCase().includes('cors');

          toast({
            title: "Sign In Failed",
            description: isNetworkError
              ? `${errorMsg}. Please check your internet connection or visit /auth-debug for diagnostics.`
              : errorMsg,
            variant: "destructive",
          });

          // Reset captcha after failed attempt
          setCaptchaVerified(false);
          setCaptchaToken(null);
        } else {
          // Record successful login
          await recordLoginAttempt(email, true);

          toast({
            title: "Welcome back!",
            description: "You have successfully signed in.",
          });
        }
      } else {
        const { error } = await signUp(email, password);
        if (error) {
          const errorMsg = error.message || "An unknown error occurred";
          const isNetworkError = errorMsg.toLowerCase().includes('fetch') ||
            errorMsg.toLowerCase().includes('network') ||
            errorMsg.toLowerCase().includes('cors');

          toast({
            title: "Sign Up Failed",
            description: isNetworkError
              ? `${errorMsg}. Please check your internet connection or visit /auth-debug for diagnostics.`
              : errorMsg,
            variant: "destructive",
          });
        } else {

          // Send welcome email
          try {
            await supabase.functions.invoke('send-auth-email', {
              body: {
                email,
                type: 'welcome',
                userData: { name: email.split('@')[0] }
              }
            });
          } catch (err) {
            // Fail silently
          }

          toast({
            title: "Welcome to Forward Focus!",
            description: "Your account has been created. Check your email for next steps!",
          });
        }
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: `Unexpected error: ${err.message}. Visit /auth-debug for diagnostics.`,
        variant: "destructive",
      });
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthLoading(true);
    try {
      const providerCheck = await checkOAuthProviderEnabled("google");
      if (!providerCheck.enabled) {
        toast({
          title: "Google Sign In Unavailable",
          description: providerCheck.message || "Google OAuth is not enabled in Supabase. Enable it in Authentication > Providers.",
          variant: "destructive",
        });
        return;
      }

      const { error } = await signInWithGoogle();
      if (error) {
        toast({
          title: "Google Sign In Failed",
          description: error.message,
          variant: "destructive",
        });
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setAuthLoading(true);
    try {
      const providerCheck = await checkOAuthProviderEnabled("apple");
      if (!providerCheck.enabled) {
        toast({
          title: "Apple Sign In Unavailable",
          description: providerCheck.message || "Apple OAuth is not enabled in Supabase. Enable it in Authentication > Providers.",
          variant: "destructive",
        });
        return;
      }

      const { error } = await signInWithApple();
      if (error) {
        toast({
          title: "Apple Sign In Failed",
          description: error.message,
          variant: "destructive",
        });
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const checkOAuthProviderEnabled = async (provider: OAuthProvider): Promise<{ enabled: boolean; message?: string }> => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      if (!supabaseUrl || !supabaseKey) {
        return {
          enabled: false,
          message: "Supabase environment variables are missing."
        };
      }

      const response = await fetch(`${supabaseUrl}/auth/v1/settings`, {
        method: "GET",
        headers: {
          apikey: supabaseKey,
        },
      });

      if (!response.ok) {
        // Do not hard-block OAuth on transient settings fetch errors.
        return { enabled: true };
      }

      const data = await response.json();
      const externalConfig = data?.external;
      const providerConfig = externalConfig?.[provider];

      const isEnabled =
        typeof providerConfig === "boolean"
          ? providerConfig
          : typeof providerConfig?.enabled === "boolean"
            ? providerConfig.enabled
            : Boolean(providerConfig);

      if (!isEnabled) {
        return {
          enabled: false,
          message: `${provider.charAt(0).toUpperCase() + provider.slice(1)} OAuth is disabled in your Supabase project. Enable it in Authentication > Providers.`
        };
      }

      return { enabled: true };
    } catch {
      // Avoid blocking the flow if the settings check itself fails.
      return { enabled: true };
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast({
        title: "Email Required",
        description: "Please enter your email address to reset your password.",
        variant: "destructive",
      });
      return;
    }

    setIsResettingPassword(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`,
      });

      if (error) {
        toast({
          title: "Password Reset Failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Check Your Email",
          description: "We've sent you a password reset link. Please check your email and follow the instructions.",
        });
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to send password reset email.",
        variant: "destructive",
      });
    } finally {
      setIsResettingPassword(false);
    }
  };

  if (loading) {
    return (
      <AuthLayout>
        <div className="col-span-full flex items-center justify-center">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <Skeleton className="h-8 w-3/4 mb-2" />
              <Skeleton className="h-4 w-full" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      {/* Image Column */}
      <div className="flex justify-center md:justify-start order-2 md:order-1">
        <div className="max-w-md w-full rounded-xl shadow-sm overflow-hidden">
          <img
            src={communityImage}
            alt="Diverse families in a supportive community healing together"
            loading="lazy"
            className="w-full h-64 md:h-80 object-cover"
          />
        </div>
      </div>

      {/* Form Column */}
      <div className="flex justify-center md:justify-end order-1 md:order-2">
        <Card className="max-w-md w-full rounded-xl shadow-sm bg-white">
          <CardHeader className="p-6 pb-4">
            <div className="text-center space-y-2">
              <CardTitle className="font-heading text-2xl md:text-3xl font-bold">
                Welcome to Forward Focus Elevation
              </CardTitle>
              <p className="text-slate-600 text-sm">
                Join a safe, supportive community built for growth and healing
              </p>
            </div>
          </CardHeader>

          <CardContent className="p-6 pt-2 space-y-5">
            {/* Rate Limit Warning */}
            {rateLimitStatus && (
              <RateLimitWarning
                isRateLimited={rateLimitStatus.isRateLimited}
                attemptsRemaining={rateLimitStatus.attemptsRemaining}
                resetAt={rateLimitStatus.resetAt}
                isLockedOut={rateLimitStatus.isLockedOut}
                lockoutUntil={rateLimitStatus.lockoutUntil}
              />
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-foreground">
                  Email Address
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoFocus={true}
                  required
                  className="h-10 text-sm"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-foreground">
                  Password
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-10 text-sm pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-10 px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={0}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                {!isLogin && password && (
                  <PasswordStrengthIndicator password={password} />
                )}
              </div>

              {!isLogin && (
                <div className="space-y-2">
                  <label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="h-10 text-sm pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-10 px-3 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      tabIndex={0}
                      aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {isLogin && (
                <div className="text-right">
                  <Button
                    type="button"
                    variant="link"
                    onClick={handleForgotPassword}
                    disabled={isResettingPassword}
                    className="text-xs text-muted-foreground hover:text-primary p-0 h-auto"
                    tabIndex={0}
                  >
                    {isResettingPassword ? "Sending..." : "Forgot Password?"}
                  </Button>
                </div>
              )}
              {/* CAPTCHA - shown after 3 failed attempts */}
              {isLogin && rateLimitStatus?.requiresCaptcha && !captchaVerified && (
                <SimpleCaptcha
                  onVerify={setCaptchaVerified}
                  onTokenGenerated={setCaptchaToken}
                />
              )}

              <Button
                type="submit"
                disabled={authLoading || rateLimitStatus?.isRateLimited || rateLimitStatus?.isLockedOut || (rateLimitStatus?.requiresCaptcha && !captchaVerified)}
                variant="premium"
                className="w-full h-10 text-sm font-medium"
                tabIndex={0}
              >
                {authLoading ? "Loading..." : isLogin ? "Sign In" : "Create Account"}
              </Button>
            </form>

            <div className="text-center">
              <Button
                type="button"
                variant="link"
                onClick={() => setIsLogin(!isLogin)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setIsLogin(!isLogin);
                  }
                }}
                className="text-sm text-muted-foreground hover:text-primary p-0"
                tabIndex={0}
                aria-label={isLogin ? "Switch to sign up mode" : "Switch to sign in mode"}
              >
                {isLogin
                  ? "Don't have an account? Sign up"
                  : "Already have an account? Sign in"
                }
              </Button>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Press Enter to toggle
              </p>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-muted" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 text-xs rounded-md"
                  onClick={handleGoogleSignIn}
                  disabled={authLoading}
                  tabIndex={0}
                  aria-label="Sign in with Google"
                >
                  <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Google
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 text-xs rounded-md"
                  onClick={handleAppleSignIn}
                  disabled={authLoading}
                  tabIndex={0}
                  aria-label="Sign in with Apple"
                >
                  <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                  </svg>
                  Apple
                </Button>
              </div>
            </div>

            <div className="text-center">
              <Button variant="link" className="text-xs text-muted-foreground hover:text-primary p-0" asChild>
                <Link to="/support">Need help? Contact Support</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AuthLayout>
  );
};

export default Auth;