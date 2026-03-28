import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeInput } from "@/lib/security";
import { NavLink, useLocation } from "react-router-dom";
import { AlertCircle, Shield, CheckCircle, Sparkles } from "lucide-react";
import { SUPPORT_EMAIL } from "@/config/contact";

const RequestPartnerVerification = () => {
  const { user } = useAuth();
  const location = useLocation();
  const fromSignup = location.state?.fromSignup || false;
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    verificationType: 'partner',
    organizationName: '',
    partnershipVision: ''
  });

  // Pre-fill email and name from user profile
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('email, full_name, phone')
          .eq('id', user.id)
          .maybeSingle();
        
        if (!error && data) {
          setFormData(prev => ({
            ...prev,
            contactEmail: data.email || '',
            contactName: data.full_name || '',
            contactPhone: data.phone || ''
          }));
        }
      }
    };
    fetchUserProfile();
  }, [user]);

  useEffect(() => {
    document.title = "Request Partner Verification | Forward Focus";
  }, []);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to request verification.",
        variant: "destructive"
      });
      return;
    }

    // Validate required fields
    if (!formData.contactName || !formData.contactEmail || !formData.contactPhone || 
        !formData.organizationName || !formData.partnershipVision) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.contactEmail)) {
      toast({
        title: "Invalid Email",
        description: "Please provide a valid email address.",
        variant: "destructive"
      });
      return;
    }

    // Validate phone format (basic validation)
    const phoneRegex = /^[\d\s\-()+.ext]+$/;
    if (!phoneRegex.test(formData.contactPhone)) {
      toast({
        title: "Invalid Phone Number",
        description: "Please provide a valid phone number.",
        variant: "destructive"
      });
      return;
    }

    if (formData.partnershipVision.length < 50) {
      toast({
        title: "Tell Us More",
        description: "Please share at least 50 characters about your partnership vision.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    try {
      // Check if user already has a pending or approved verification
      const { data: existingVerification, error: checkError } = await supabase
        .from('partner_verifications')
        .select('status')
        .eq('user_id', user.id)
        .in('status', ['pending', 'approved'])
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking existing verification:', checkError);
        throw checkError;
      }

      if (existingVerification) {
        toast({
          title: "Verification Already Exists",
          description: `You already have a ${existingVerification.status} verification request.`,
          variant: "destructive"
        });
        return;
      }

      // Sanitize inputs
      const sanitizedData = {
        user_id: user.id,
        contact_name: sanitizeInput(formData.contactName),
        contact_email: sanitizeInput(formData.contactEmail),
        contact_phone: sanitizeInput(formData.contactPhone),
        organization_name: sanitizeInput(formData.organizationName),
        organization_type: formData.verificationType,
        notes: sanitizeInput(formData.partnershipVision),
        status: 'pending'
      };

      const { error } = await supabase
        .from('partner_verifications')
        .insert(sanitizedData);

      if (error) {
        console.error('Error submitting verification request:', error);
        throw error;
      }

      toast({ 
        title: "Verification Request Submitted", 
        description: "Thank you! Our team will review your request within 3-5 business days." 
      });
      
      // Clear form
      setFormData({
        contactName: '',
        contactPhone: '',
        contactEmail: '',
        verificationType: 'partner',
        organizationName: '',
        partnershipVision: ''
      });

    } catch (error) {
      console.error('Error submitting verification request:', error);
      toast({
        title: "Submission Failed",
        description: "There was an error submitting your request. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <main id="main" className="min-h-screen bg-gradient-osu-subtle">
        <div className="container py-16">
          <div className="max-w-2xl mx-auto text-center">
            <Card className="border-osu-gray/20 shadow-lg">
              <CardContent className="p-8">
                <AlertCircle className="h-12 w-12 text-osu-gray mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-4 text-osu-scarlet">Authentication Required</h2>
                <p className="text-osu-gray mb-6">
                  Please sign in to request partner verification.
                </p>
                <div className="space-x-4">
                  <Button asChild className="bg-osu-scarlet hover:bg-osu-scarlet-dark">
                    <NavLink to="/partner-signin">Sign In</NavLink>
                  </Button>
                  <Button asChild variant="outline" className="border-osu-scarlet text-osu-scarlet hover:bg-osu-scarlet/10">
                    <NavLink to="/partner-signup">Create Account</NavLink>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main id="main" className="min-h-screen bg-gradient-osu-subtle">
      <div className="bg-gradient-osu-primary border-b border-osu-scarlet/20">
        <div className="container py-16">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Shield className="h-10 w-10 text-white" />
            </div>
            <h1 className="font-heading text-4xl md:text-5xl font-bold mb-4 text-white">
              Let's Build Something Together
            </h1>
            <p className="text-xl text-white">
              Join our network of partners creating real impact in our communities
            </p>
          </div>
        </div>
      </div>
      
      <div className="container py-12">
        <div className="max-w-2xl mx-auto">
          {/* Welcome Message for New Signups */}
          {fromSignup && (
            <Alert className="mb-6 bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
              <Sparkles className="h-5 w-5 text-green-600" />
              <AlertDescription className="text-green-900">
                <strong>Welcome aboard!</strong> Complete your partner verification below to unlock all partnership features.
              </AlertDescription>
            </Alert>
          )}

          {/* Partnership Collaboration */}
          <Card className="mb-8 border-osu-gray/20 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-osu-scarlet/5 to-osu-gray/5">
              <CardTitle className="flex items-center gap-2 text-osu-scarlet">
                <CheckCircle className="h-5 w-5" />
                Partnership Collaboration
              </CardTitle>
              <CardDescription className="text-osu-gray">
                How we'll work together to create lasting impact
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <ul className="space-y-2 text-sm text-osu-gray">
                <li>• <strong>Connect:</strong> Build relationships with families and other community partners</li>
                <li>• <strong>Share:</strong> Contribute resources and expertise to strengthen our network</li>
                <li>• <strong>Grow:</strong> Access training, tools, and support to amplify your mission</li>
                <li>• <strong>Celebrate:</strong> Showcase success stories and community impact together</li>
                <li>• <strong>Innovate:</strong> Join exclusive partner events to co-create solutions</li>
                <li>• <strong>Lead:</strong> Get featured as a trusted voice in our partner directory</li>
              </ul>
            </CardContent>
          </Card>

          {/* Verification Form */}
          <Card className="border-osu-gray/20 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-osu-scarlet/5 to-osu-gray/5">
              <CardTitle className="text-osu-scarlet">Verification Application</CardTitle>
              <CardDescription className="text-osu-gray">
                Tell us about your organization and why you'd like to be verified
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={onSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-osu-scarlet">
                    Full Name *
                  </label>
                  <Input 
                    required 
                    placeholder="Your full name" 
                    value={formData.contactName}
                    onChange={(e) => handleInputChange('contactName', e.target.value)}
                    className="h-12 border-osu-gray/30 focus:border-osu-scarlet focus:ring-osu-scarlet/20" 
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2 text-osu-scarlet">
                    Email Address *
                  </label>
                  <Input 
                    required 
                    type="email"
                    placeholder="your.email@organization.org" 
                    value={formData.contactEmail}
                    onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                    className="h-12 border-osu-gray/30 focus:border-osu-scarlet focus:ring-osu-scarlet/20" 
                  />
                  <p className="text-xs text-osu-gray mt-1">
                    We'll use this email to communicate about your verification
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2 text-osu-scarlet">
                    Phone Number *
                  </label>
                  <Input 
                    required 
                    type="tel"
                    placeholder="(555) 123-4567 ext. 123" 
                    value={formData.contactPhone}
                    onChange={(e) => handleInputChange('contactPhone', e.target.value)}
                    className="h-12 border-osu-gray/30 focus:border-osu-scarlet focus:ring-osu-scarlet/20" 
                  />
                  <p className="text-xs text-osu-gray mt-1">
                    Include extension if applicable
                  </p>
                </div>

                <div className="pt-4 border-t border-osu-gray/20">
                  <label className="block text-sm font-semibold mb-2 text-osu-scarlet">
                    Verification Type
                  </label>
                  <Select 
                    value={formData.verificationType} 
                    onValueChange={(value) => handleInputChange('verificationType', value)}
                  >
                    <SelectTrigger className="h-12 border-osu-gray/30 focus:border-osu-scarlet focus:ring-osu-scarlet/20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-50 bg-popover border border-osu-gray/20">
                      <SelectItem value="partner" className="hover:bg-osu-scarlet/5">Community Partner</SelectItem>
                      <SelectItem value="nonprofit" className="hover:bg-osu-scarlet/5">Nonprofit Organization</SelectItem>
                      <SelectItem value="government" className="hover:bg-osu-scarlet/5">Government Agency</SelectItem>
                      <SelectItem value="healthcare" className="hover:bg-osu-scarlet/5">Healthcare Provider</SelectItem>
                      <SelectItem value="education" className="hover:bg-osu-scarlet/5">Educational Institution</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2 text-osu-scarlet">
                    Organization Name *
                  </label>
                  <Input 
                    required 
                    placeholder="Your organization's official name" 
                    value={formData.organizationName}
                    onChange={(e) => handleInputChange('organizationName', e.target.value)}
                    className="h-12 border-osu-gray/30 focus:border-osu-scarlet focus:ring-osu-scarlet/20" 
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2 text-osu-scarlet">
                    How Can We Partner? *
                  </label>
                  <Textarea 
                    required 
                    placeholder="Tell us about your partnership vision:
• How can we support your mission?
• What resources or connections would benefit your community?
• How can your organization help justice-impacted individuals?
• What makes your approach unique and impactful?"
                    value={formData.partnershipVision}
                    onChange={(e) => handleInputChange('partnershipVision', e.target.value)}
                    className="min-h-32 border-osu-gray/30 focus:border-osu-scarlet focus:ring-osu-scarlet/20" 
                  />
                  <p className="text-xs text-osu-gray mt-1">
                    Share your vision with us ({formData.partnershipVision.length}/50 characters minimum)
                  </p>
                </div>

                <Button 
                  type="submit" 
                  disabled={loading || formData.partnershipVision.length < 50} 
                  size="lg" 
                  className="w-full h-12 bg-gradient-to-r from-osu-scarlet to-osu-gray hover:from-osu-scarlet/90 hover:to-osu-gray/90 text-white shadow-lg"
                >
                  {loading ? "Submitting Partnership Request..." : "Start Our Partnership"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Support Contact */}
          <div className="mt-8 text-center">
            <p className="text-sm text-osu-gray">
              Questions about verification? Contact us at{" "}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="text-osu-scarlet hover:underline">
                {SUPPORT_EMAIL}
              </a>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
};

export default RequestPartnerVerification;