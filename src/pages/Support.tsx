import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Mail, Phone, MapPin, Clock, Heart, Building2, Presentation, Landmark, GraduationCap, BookOpenCheck } from "lucide-react";
import DonationBoxes from "@/components/support/DonationBoxes";
import SpeakerApplicationForm from "@/components/support/SpeakerApplicationForm";
import GrantInquiryForm from "@/components/support/GrantInquiryForm";
import AIConsultationForm from "@/components/support/AIConsultationForm";
import CorporateTrainingForm from "@/components/support/CorporateTrainingForm";
import ContactForm from "@/components/forms/ContactForm";
import { useCalendlyPopup } from "@/hooks/useCalendlyPopup";
import { SUPPORT_EMAIL, ORGANIZATION_NAME, CONTACT_CONFIG } from "@/config/contact";
import { SEOHead } from "@/components/seo/SEOHead";
import { SITE_CONFIG } from "@/config/site";

const Support = () => {
  const [activeDialog, setActiveDialog] = useState<string | null>(null);
  const { openCalendly, calendlyReady } = useCalendlyPopup();

  return (
    <>
      <SEOHead
        title="Get Involved"
        description={`Support ${SITE_CONFIG.name} through donations, sponsorships, speaking engagements, or corporate training. Multiple ways to invest in second chances.`}
        path="/support"
      />
    <main id="main">
      {/* Hero Section */}
      <header className="relative bg-gradient-osu-primary text-white overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-osu-scarlet/90 via-osu-gray/85 to-osu-scarlet-dark/80"></div>
        <div className="relative container py-24 md:py-32">
          <div className="max-w-5xl mx-auto text-center">
            <h1 className="font-heading text-4xl md:text-5xl font-bold mb-8 leading-tight">
              Multiple Ways to Invest in Second Chances
            </h1>
            <p className="text-lg md:text-xl mb-12 text-white/90 leading-relaxed max-w-3xl mx-auto">
              Choose how you want to support our AI-powered digital education hub that transforms lives and builds stronger communities
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button 
                size="lg" 
                className="get-involved-gold-button border-none shadow-xl px-12"
                onClick={() => setActiveDialog('donate')}
              >
                Donate
              </Button>
              <Button 
                size="lg" 
                className="bg-osu-gray hover:bg-osu-gray-dark text-white shadow-xl px-12"
                onClick={() => setActiveDialog('donate')}
              >
                Sponsor
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container py-16 md:py-20">
        <div className="max-w-6xl mx-auto space-y-24">
        {/* Ways to Support Grid */}
        <section className="bg-secondary/5 py-16 rounded-2xl border-2 border-osu-scarlet/20 overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="bg-background rounded-xl p-6 h-full border-2 border-osu-scarlet/30 shadow-lg hover:shadow-xl hover:shadow-osu-scarlet/20 transition-all duration-300 md:hover:scale-105 md:hover:-translate-y-1">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-3 bg-osu-scarlet/10 rounded-full">
                    <Heart className="h-6 w-6 text-osu-scarlet" />
                  </div>
                  <CardTitle className="text-xl font-semibold text-foreground">Start Small, Think Big</CardTitle>
                </div>
                <CardDescription className="text-foreground/70 text-base leading-relaxed">
                  Every dollar powers our AI digital hub providing free resources through <strong>{SITE_CONFIG.services.collective}</strong> and the <strong>{SITE_CONFIG.services.healing}</strong> for justice-impacted families.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0 flex-1 flex flex-col justify-between">
                <Dialog open={activeDialog === 'donate'} onOpenChange={(open) => setActiveDialog(open ? 'donate' : null)}>
                  <DialogTrigger asChild>
                    <Button className="get-involved-gold-button border-none w-full shadow-md mt-4">
                      Donate Now
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                    <DialogHeader>
                      <DialogTitle className="text-2xl">Choose Your Donation Amount</DialogTitle>
                      <DialogDescription className="sr-only">Select a donation amount to support the mission.</DialogDescription>
                    </DialogHeader>
                    <DonationBoxes />
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>

            <Card className="bg-background rounded-xl p-6 h-full border-2 border-osu-scarlet/30 shadow-lg hover:shadow-xl hover:shadow-osu-scarlet/20 transition-all duration-300 md:hover:scale-105 md:hover:-translate-y-1">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-3 bg-osu-scarlet/10 rounded-full">
                    <Building2 className="h-6 w-6 text-osu-scarlet" />
                  </div>
                  <CardTitle className="text-xl font-semibold text-foreground">Sponsor Success Stories</CardTitle>
                </div>
                <CardDescription className="text-foreground/70 text-base leading-relaxed">
                  Sponsor accelerator cohorts, youth AI workshops, or our entire platform. Join us in breaking cycles and creating lasting pathways to success.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0 flex-1 flex flex-col justify-between">
                <Button className="get-involved-gold-button border-none w-full shadow-md mt-4" onClick={() => setActiveDialog('donate')}>
                  Explore Sponsorship
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-background rounded-xl p-6 h-full border-2 border-osu-scarlet/30 shadow-lg hover:shadow-xl hover:shadow-osu-scarlet/20 transition-all duration-300 md:hover:scale-105 md:hover:-translate-y-1">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-3 bg-osu-scarlet/10 rounded-full">
                    <Presentation className="h-6 w-6 text-osu-scarlet" />
                  </div>
                  <CardTitle className="text-xl font-semibold text-foreground">Share Your Expertise</CardTitle>
                </div>
                <CardDescription className="text-foreground/70 text-base leading-relaxed">
                  Join our speaker bureau to present to our community and help justice-impacted individuals learn from experienced industry leaders.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0 flex-1 flex flex-col justify-between">
                <Dialog open={activeDialog === 'speaker'} onOpenChange={(open) => setActiveDialog(open ? 'speaker' : null)}>
                  <DialogTrigger asChild>
                    <Button className="get-involved-gold-button border-none w-full shadow-md mt-4">
                      Apply to Speak
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                    <DialogHeader className="sr-only">
                      <DialogTitle>Apply to Speak</DialogTitle>
                      <DialogDescription>Complete the speaker application form.</DialogDescription>
                    </DialogHeader>
                    <SpeakerApplicationForm />
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>

            <Card className="bg-background rounded-xl p-6 h-full border-2 border-osu-scarlet/30 shadow-lg hover:shadow-xl hover:shadow-osu-scarlet/20 transition-all duration-300 md:hover:scale-105 md:hover:-translate-y-1">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-3 bg-osu-scarlet/10 rounded-full">
                    <Landmark className="h-6 w-6 text-osu-scarlet" />
                  </div>
                  <CardTitle className="text-xl font-semibold text-foreground">AI Consultation Services</CardTitle>
                </div>
                <CardDescription className="text-foreground/70 text-base leading-relaxed">
                  Contract our AI expertise to build custom solutions for your organization while directly supporting our community mission.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0 flex-1 flex flex-col justify-between">
                <Dialog open={activeDialog === 'consultation'} onOpenChange={(open) => setActiveDialog(open ? 'consultation' : null)}>
                  <DialogTrigger asChild>
                    <Button className="get-involved-gold-button border-none w-full shadow-md mt-4">
                      Request Consultation
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                    <DialogHeader className="sr-only">
                      <DialogTitle>Request Consultation</DialogTitle>
                      <DialogDescription>Submit an AI consultation request for your organization.</DialogDescription>
                    </DialogHeader>
                    <AIConsultationForm />
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>

            <Card className="bg-background rounded-xl p-6 h-full border-2 border-osu-scarlet/30 shadow-lg hover:shadow-xl hover:shadow-osu-scarlet/20 transition-all duration-300 md:hover:scale-105 md:hover:-translate-y-1">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-3 bg-osu-scarlet/10 rounded-full">
                    <GraduationCap className="h-6 w-6 text-osu-scarlet" />
                  </div>
                  <CardTitle className="text-xl font-semibold text-foreground">Grant Funding</CardTitle>
                </div>
                <CardDescription className="text-foreground/70 text-base leading-relaxed">
                  Foundations can fund our innovative approach combining AI technology with justice reform and sustainable community building.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0 flex-1 flex flex-col justify-between">
                <Dialog open={activeDialog === 'grant'} onOpenChange={(open) => setActiveDialog(open ? 'grant' : null)}>
                  <DialogTrigger asChild>
                    <Button className="get-involved-gold-button border-none w-full shadow-md mt-4">
                      Submit Grant Inquiry
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                    <DialogHeader className="sr-only">
                      <DialogTitle>Grant Inquiry</DialogTitle>
                      <DialogDescription>Submit a grant inquiry form.</DialogDescription>
                    </DialogHeader>
                    <GrantInquiryForm />
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>

            <Card className="bg-background rounded-xl p-6 h-full border-2 border-osu-scarlet/30 shadow-lg hover:shadow-xl hover:shadow-osu-scarlet/20 transition-all duration-300 md:hover:scale-105 md:hover:-translate-y-1">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-3 bg-osu-scarlet/10 rounded-full">
                    <BookOpenCheck className="h-6 w-6 text-osu-scarlet" />
                  </div>
                  <CardTitle className="text-xl font-semibold text-foreground">Corporate AI Training</CardTitle>
                </div>
                <CardDescription className="text-foreground/70 text-base leading-relaxed">
                  Train your team in cutting-edge AI skills while supporting our mission to help justice-impacted communities thrive.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0 flex-1 flex flex-col justify-between">
                <Dialog open={activeDialog === 'training'} onOpenChange={(open) => setActiveDialog(open ? 'training' : null)}>
                  <DialogTrigger asChild>
                    <Button className="get-involved-gold-button border-none w-full shadow-md mt-4">
                      Request Training
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                    <DialogHeader className="sr-only">
                      <DialogTitle>Corporate Training Request</DialogTitle>
                      <DialogDescription>Submit a request for corporate training services.</DialogDescription>
                    </DialogHeader>
                    <CorporateTrainingForm />
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Why Support Matters */}
        <section className="text-center">
          <div className="max-w-4xl mx-auto">
            <h2 className="font-heading text-4xl md:text-5xl font-bold text-foreground mb-6">
              Why Your Investment Matters
            </h2>
            <p className="text-xl text-foreground/70 leading-relaxed">
              Our AI-powered digital education hub is transforming how justice-impacted families access support, education, and opportunities. 
              Your investment helps us scale innovative technology that creates lasting systemic change.
            </p>
          </div>
        </section>

        {/* Contact Section */}
        <section className="bg-secondary/5 py-24 rounded-2xl">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
              {/* Contact Form */}
              <div>
                <h2 className="font-heading text-4xl md:text-5xl font-bold text-foreground mb-8">Get In Touch</h2>
                <ContactForm type="contact" />
              </div>

              {/* Contact Info */}
              <div>
                <h2 className="font-heading text-4xl md:text-5xl font-bold text-foreground mb-8">Other Ways to Reach Us</h2>
                <Card className="bg-background shadow-lg">
                  <CardContent className="p-8">
                    <div className="space-y-6">
                      <div className="flex items-center gap-4 text-lg">
                        <Mail className="h-6 w-6 text-muted-foreground" />
                        <span className="text-foreground">{SUPPORT_EMAIL}</span>
                      </div>
                      <div className="flex items-center gap-4 text-lg">
                        <Phone className="h-6 w-6 text-muted-foreground" />
                        <span className="text-foreground">{CONTACT_CONFIG.phone.main}</span>
                      </div>
                      <div className="flex items-center gap-4 text-lg">
                        <MapPin className="h-6 w-6 text-muted-foreground" />
                        <span className="text-foreground">Columbus, Ohio</span>
                      </div>
                      <div className="flex items-center gap-4 text-lg">
                        <Clock className="h-6 w-6 text-muted-foreground" />
                        <span className="text-foreground">Mon-Fri, 9AM-5PM EST</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="bg-gradient-to-br from-primary via-accent to-secondary text-primary-foreground rounded-2xl overflow-hidden shadow-2xl">
          <div className="px-8 py-24 md:py-32">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="font-heading text-4xl md:text-6xl font-bold mb-12">
                Not Sure Which Option Fits?
              </h2>
              <p className="text-lg md:text-xl leading-relaxed mb-12 text-primary-foreground/95 max-w-2xl mx-auto">
                Let's talk! Schedule a 15-minute consultation to explore how you can invest in transforming lives through innovative digital education.
              </p>
               <div className="flex justify-center">
                 <Button 
                   type="button"
                   size="lg" 
                   variant="secondary" 
                   className="px-8 text-lg bg-white text-primary hover:bg-white/90"
                   disabled={!calendlyReady}
                   onClick={(e) => {
                     e.preventDefault();
                     e.stopPropagation();
                     openCalendly('https://calendly.com/ffe_coach_kay/free-call');
                   }}
                 >
                   Schedule a Chat
                 </Button>
               </div>
            </div>
          </div>
        </section>
        </div>
      </div>
    </main>
    </>
  );
};

export default Support;
