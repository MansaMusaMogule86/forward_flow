import { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeInput, isValidEmail, isValidPhone, RateLimiter, generateCSRFToken } from "@/lib/security";
import { ArrowLeft } from "lucide-react";
const SubmitReferral = () => {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [notes, setNotes] = useState("");
  const [csrfToken] = useState(generateCSRFToken());
  const rateLimiter = useRef(new RateLimiter());
  useEffect(() => {
    document.title = "Submit Referral | Partner Portal";
  }, []);
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Rate limiting check
    const clientId = `${contactInfo || 'anonymous'}_referral`;
    if (rateLimiter.current.isRateLimited(clientId, 2, 600000)) {
      // 2 attempts per 10 minutes
      toast({
        title: "Error",
        description: "Too many attempts. Please wait 10 minutes before trying again.",
        variant: "destructive"
      });
      return;
    }

    // Sanitize inputs
    const sanitizedName = sanitizeInput(name);
    const sanitizedContactInfo = sanitizeInput(contactInfo);
    const sanitizedNotes = sanitizeInput(notes);

    // Validation
    if (!sanitizedName || !sanitizedContactInfo || !sanitizedNotes) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }
    if (sanitizedName.length < 2 || sanitizedName.length > 100) {
      toast({
        title: "Error",
        description: "Name must be between 2 and 100 characters",
        variant: "destructive"
      });
      return;
    }

    // Validate contact info (email or phone)
    const isEmail = sanitizedContactInfo.includes('@');
    const isPhone = /^\+?[\d\s\-().]{10,}$/.test(sanitizedContactInfo);
    if (!isEmail && !isPhone) {
      toast({
        title: "Error",
        description: "Please provide a valid email address or phone number",
        variant: "destructive"
      });
      return;
    }
    if (isEmail && !isValidEmail(sanitizedContactInfo)) {
      toast({
        title: "Error",
        description: "Please provide a valid email address",
        variant: "destructive"
      });
      return;
    }
    if (isPhone && !isValidPhone(sanitizedContactInfo)) {
      toast({
        title: "Error",
        description: "Please provide a valid phone number",
        variant: "destructive"
      });
      return;
    }
    if (sanitizedNotes.length < 10 || sanitizedNotes.length > 500) {
      toast({
        title: "Error",
        description: "Notes must be between 10 and 500 characters",
        variant: "destructive"
      });
      return;
    }
    setLoading(true);
    try {
      // Get current user's partner ID
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to submit referrals",
          variant: "destructive"
        });
        return;
      }

      // Get partner profile
      const { data: partner } = await supabase
        .from('partners')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!partner) {
        toast({
          title: "Error",
          description: "Partner profile not found. Please complete partner registration first.",
          variant: "destructive"
        });
        return;
      }

      const { error } = await supabase.from('partner_referrals').insert({
        partner_id: partner.id,
        name: sanitizedName,
        contact_info: sanitizedContactInfo,
        notes: sanitizedNotes
      });

      if (error) {
        console.error('Error submitting referral:', error);
        toast({
          title: "Error",
          description: "Failed to submit referral. Please try again.",
          variant: "destructive"
        });
        return;
      }

      // Send notification emails
      try {
        await supabase.functions.invoke('send-referral-notification', {
          body: {
            name: sanitizedName,
            contactInfo: sanitizedContactInfo,
            notes: sanitizedNotes,
            partnerEmail: user.email || 'partner@example.com'
          }
        });
      } catch (emailError) {
        console.error('Error sending notification emails:', emailError);
        // Don't fail the referral submission if email fails
      }

      toast({
        title: "Referral submitted",
        description: "We'll follow up with the individual promptly. You'll receive a confirmation email shortly."
      });
      
      // Clear form
      setName("");
      setContactInfo("");
      setNotes("");
      
    } catch (error) {
      console.error('Error submitting referral:', error);
      toast({
        title: "Error",
        description: "Failed to submit referral. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  return <main id="main" className="min-h-screen bg-gradient-osu-subtle">
      <div className="bg-gradient-osu-primary border-b border-osu-scarlet/20">
        <div className="container py-16">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="font-heading text-4xl md:text-5xl font-bold mb-4 text-white">Submit a Referral</h1>
            <p className="text-xl text-white">Connect someone in need with our comprehensive support network</p>
          </div>
        </div>
      </div>
      
      <div className="container py-12">
        <div className="max-w-2xl mx-auto">
          {/* Back to Quick Actions Button */}
          <div className="mb-6">
            <Button asChild variant="outline" className="border-osu-gray/30 text-osu-gray hover:bg-osu-scarlet hover:text-white">
              <NavLink to="/partners?tab=actions" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Quick Actions
              </NavLink>
            </Button>
          </div>
          
          <div className="bg-card rounded-xl shadow-lg border border-osu-scarlet/10 p-8 text-left">
            <form onSubmit={onSubmit} className="grid gap-6">
              <div>
                <label className="block text-lg font-semibold mb-2 text-osu-scarlet">Individual's Name</label>
                <Input required placeholder="Full name" value={name} onChange={e => setName(e.target.value)} className="h-12 text-lg border-osu-gray/30 focus:border-osu-scarlet focus:ring-osu-scarlet/20" />
              </div>
              <div>
                <label className="block text-lg font-semibold mb-2 text-osu-scarlet">Contact Email or Phone</label>
                <Input required placeholder="email@domain.com or (555) 555-5555" value={contactInfo} onChange={e => setContactInfo(e.target.value)} className="h-12 text-lg border-osu-gray/30 focus:border-osu-scarlet focus:ring-osu-scarlet/20" />
              </div>
              <div>
                <label className="block text-lg font-semibold mb-2 text-osu-scarlet">Referral Notes</label>
                <Textarea required placeholder="Briefly describe the situation and needs" value={notes} onChange={e => setNotes(e.target.value)} className="min-h-32 text-lg border-osu-gray/30 focus:border-osu-scarlet focus:ring-osu-scarlet/20" />
              </div>
              <Button type="submit" disabled={loading} size="lg" className="h-14 text-lg bg-gradient-to-r from-osu-scarlet to-osu-gray hover:from-osu-scarlet/90 hover:to-osu-gray/90 text-white shadow-lg">
                {loading ? "Submitting..." : "Submit Referral"}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </main>;
};
export default SubmitReferral;