import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Mail, Send, CheckCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { sanitizeFormData, isValidEmail, RateLimiter } from "@/lib/security";
interface ContactFormProps {
  type?: 'contact' | 'coaching' | 'booking';
  title?: string;
  description?: string;
  className?: string;
}
export default function ContactForm({
  type = 'contact',
  title,
  description,
  className = ""
}: ContactFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const rateLimiter = useRef(new RateLimiter());
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Rate limiting check
    const clientId = `${formData.email || 'anonymous'}_contact`;
    if (rateLimiter.current.isRateLimited(clientId, 3, 300000)) {
      // 3 attempts per 5 minutes
      toast.error("Too many attempts. Please wait 5 minutes before trying again.");
      return;
    }

    // Sanitize input data
    const sanitizedData = sanitizeFormData(formData);

    // Validation
    if (!sanitizedData.name || !sanitizedData.email || !sanitizedData.message) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (!isValidEmail(sanitizedData.email)) {
      toast.error("Please enter a valid email address");
      return;
    }
    if (sanitizedData.name.length < 2 || sanitizedData.name.length > 100) {
      toast.error("Name must be between 2 and 100 characters");
      return;
    }
    if (sanitizedData.message.length < 10 || sanitizedData.message.length > 1000) {
      toast.error("Message must be between 10 and 1000 characters");
      return;
    }
    setIsSubmitting(true);
    try {
      // Save to database first
      const { error: dbError } = await supabase.from('contact_submissions').insert({
        name: sanitizedData.name,
        email: sanitizedData.email,
        subject: sanitizedData.subject || getDefaultSubject(),
        message: sanitizedData.message,
        form_type: type,
        status: 'new'
      });

      if (dbError) {
        console.error('Error saving to database:', dbError);
        // Continue with email even if database fails
      }

      // Send email notification
      const { error } = await supabase.functions.invoke('send-contact-email', {
        body: {
          ...sanitizedData,
          type,
          subject: sanitizedData.subject || getDefaultSubject()
        }
      });
      
      if (error) {
        console.error('Error sending email:', error);
        toast.error("Failed to send message. Please try again.");
      } else {
        setIsSubmitted(true);
        toast.success("Message sent successfully! We'll get back to you soon.");
        setFormData({
          name: '',
          email: '',
          subject: '',
          message: ''
        });
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error("Failed to send message. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };
  const getDefaultSubject = () => {
    switch (type) {
      case 'coaching':
        return 'Coaching Inquiry';
      case 'booking':
        return 'Consultation Booking Request';
      default:
        return 'General Inquiry';
    }
  };
  const getFormTitle = () => {
    if (title) return title;
    switch (type) {
      case 'coaching':
        return 'Connect with Coach Kay';
      case 'booking':
        return 'Book a Consultation';
      default:
        return 'Contact Us';
    }
  };
  const getFormDescription = () => {
    if (description) return description;
    switch (type) {
      case 'coaching':
        return 'Get personalized guidance from Coach Kay. Share your goals and challenges, and let\'s create a path forward together.';
      case 'booking':
        return 'Schedule a one-on-one consultation to discuss your specific needs and how we can support your journey.';
      default:
        return 'Have questions or need support? We\'re here to help. Send us a message and we\'ll get back to you soon.';
    }
  };
  if (isSubmitted) {
    return <Card className={`${className} border-accent/20 bg-accent/5`}>
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-8 w-8 text-accent-foreground" />
          </div>
          <h3 className="text-2xl font-semibold text-foreground mb-4">Message Sent Successfully!</h3>
          <p className="text-foreground/70 mb-6">
            Thank you for reaching out. We'll get back to you within 24-48 hours.
          </p>
          <Button onClick={() => setIsSubmitted(false)} variant="outline">
            Send Another Message
          </Button>
        </CardContent>
      </Card>;
  }
  return <Card className={`flex flex-col ${className}`}>
      <CardHeader className="text-center">
        <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mx-auto mb-4">
          <Mail className="h-6 w-6 text-primary-foreground" />
        </div>
        <CardTitle className="text-2xl font-bold text-foreground">
          {getFormTitle()}
        </CardTitle>
        <p className="text-foreground/70">
          {getFormDescription()}
        </p>
      </CardHeader>
      <CardContent className="flex flex-col flex-1 pb-6">
        <form onSubmit={handleSubmit} className="flex flex-col flex-1">
          <div className="space-y-6 flex-1">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input id="name" name="name" type="text" value={formData.name} onChange={handleInputChange} placeholder="Your full name" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input id="email" name="email" type="email" value={formData.email} onChange={handleInputChange} placeholder="your.email@example.com" required />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input id="subject" name="subject" type="text" value={formData.subject} onChange={handleInputChange} placeholder={getDefaultSubject()} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message *</Label>
              <Textarea id="message" name="message" value={formData.message} onChange={handleInputChange} placeholder={type === 'coaching' ? "Tell Coach Kay about your current situation, goals, and how she can best support you..." : type === 'booking' ? "Let us know your preferred dates and times, and what you'd like to discuss during your consultation..." : "How can we help you? Share your questions, concerns, or feedback..."} className="min-h-32" required />
            </div>
          </div>

          <Button type="submit" className="w-full get-involved-gold-button border-none mt-6" size="lg" disabled={isSubmitting}>
            {isSubmitting ? <>
                <AlertCircle className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </> : <>
                <Send className="h-4 w-4 mr-2" />
                {type === 'booking' ? 'Request Consultation' : 'Send Message'}
              </>}
          </Button>
        </form>
      </CardContent>
    </Card>;
}