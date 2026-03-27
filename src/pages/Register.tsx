import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import AuthLayout from "@/components/layout/AuthLayout";
import { PasswordStrengthIndicator } from "@/components/security/PasswordStrengthIndicator";
import { registrationFormSchema } from "@/lib/validationSchemas";
import learningCommunityImage from "@/assets/learning-community-diverse.jpg";

const Register = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate using Zod schema
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

    setLoading(true);
    
    try {
      const { error } = await signUp(email.trim().toLowerCase(), password);
      
      if (error) {
        // Handle specific error types
        if (error.message.includes("User already registered")) {
          toast({
            title: "Account Already Exists",
            description: "An account with this email already exists. Try signing in instead.",
            variant: "destructive",
          });
        } else if (error.message.includes("Invalid email")) {
          toast({
            title: "Invalid Email",
            description: "Please check your email address and try again",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Registration Failed",
            description: error.message,
            variant: "destructive",
          });
        }
      } else {
        // Send welcome email using anon key (no session exists yet before email confirmation)
        try {
          const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          if (anonKey && supabaseUrl) {
            await fetch(
              `${supabaseUrl}/functions/v1/send-auth-email`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${anonKey}`,
                },
                body: JSON.stringify({
                  email: email.trim().toLowerCase(),
                  type: 'welcome',
                  userData: {
                    name: email.split('@')[0]
                  }
                }),
              }
            );
          }
        } catch {
          // Don't fail registration if welcome email fails
        }

        toast({
          title: "Check Your Email",
          description: "We've sent a verification link to your email. Please verify your account to get started.",
        });
        // Clear form
        setEmail("");
        setPassword("");
        setConfirmPassword("");
        // Redirect to auth page
        navigate("/auth");
      }
    } catch (error: any) {
      if (import.meta.env.DEV) {
        console.error("Registration error:", error);
      }
      toast({
        title: "Registration Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      {/* Image Column */}
      <div className="flex justify-center md:justify-start order-2 md:order-1">
        <div className="max-w-md w-full rounded-xl shadow-sm overflow-hidden">
          <img 
            src={learningCommunityImage} 
            alt="Diverse families learning together in a supportive community environment"
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
                Create Account
              </CardTitle>
              <CardDescription className="text-slate-600 text-sm">
                Join our supportive community for growth and healing
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-6 pt-2 space-y-5">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-foreground">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="your@email.com"
                  className="h-10 text-sm"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-foreground">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  minLength={6}
                  className="h-10 text-sm"
                />
                <PasswordStrengthIndicator password={password} className="mt-2" />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  minLength={6}
                  className="h-10 text-sm"
                />
              </div>
              
              <Button 
                type="submit" 
                disabled={loading}
                variant="premium"
                className="w-full h-10 text-sm font-medium"
              >
                {loading ? "Creating Account..." : "Create Account"}
              </Button>
            </form>
            
            <div className="text-center">
              <Button variant="link" className="text-sm text-muted-foreground hover:text-primary p-0">
                Already have an account?{" "}
                <NavLink to="/auth" className="text-primary hover:underline ml-1">
                  Sign in
                </NavLink>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AuthLayout>
  );
};

export default Register;