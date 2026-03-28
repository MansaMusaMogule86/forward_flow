import { useState } from "react";
import { AiErrorBoundary } from "@/components/ui/AiErrorBoundary";
import { SEOHead } from "@/components/seo/SEOHead";
import { StructuredData } from "@/components/seo/StructuredData";
import { BreadcrumbSchema } from "@/components/seo/BreadcrumbSchema";
import { SITE_CONFIG } from "@/config/site";
import type { LucideIcon } from "lucide-react";
import {
  ChevronRight,
  Phone,
  MessageSquare,
  Shield,
  Heart,
  Scale,
  DollarSign,
  Users,
  Bot,
  Calendar,
  CheckCircle,
  ArrowRight,
  HelpCircle,
  ChevronDown,
  ExternalLink,
  LogIn,
  Eye,
  EyeOff,
  Brain,
  Search
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import SignupModal from "@/components/healing/SignupModal";
import VictimSupportAI from "@/components/ai/VictimSupportAI";
import DailyHealingToolkit from "@/components/healing/DailyHealingToolkit";
import AIResourceDiscovery from "@/components/ai/AIResourceDiscovery";
import diverseFamiliesImage from "@/assets/images/community/families-healing.jpg";
import healingCommunityImage from "@/assets/images/community/healing-community.jpg";

// Consistent Resource Card Component using glassmorphism
const ResourceCard = ({ resource }: { resource: any }) => (
  <div className="p-4 rounded-xl bg-white/60 border border-osu-gray/10 hover:border-osu-scarlet/20 transition-all duration-300 group">
    <div className="flex justify-between items-start mb-2">
      <h4 className="font-bold text-foreground group-hover:text-osu-scarlet transition-colors">{resource.title}</h4>
      <Badge variant="outline" className="text-[10px] uppercase tracking-wider border-osu-gray/20 text-muted-foreground">
        {resource.type}
      </Badge>
    </div>
    <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{resource.description}</p>

    <div className="flex items-center justify-between mt-auto">
      <div className="flex gap-2">
        {resource.url && (
          <Button asChild variant="ghost" size="sm" className="h-8 px-3 text-xs font-medium hover:text-osu-scarlet hover:bg-osu-scarlet/5">
            <a href={resource.url} target="_blank" rel="noopener noreferrer">
              Visit <ExternalLink className="ml-1 h-3 w-3" />
            </a>
          </Button>
        )}
        {resource.phone && (
          <Button asChild variant="ghost" size="sm" className="h-8 px-3 text-xs font-medium hover:text-osu-scarlet hover:bg-osu-scarlet/5">
            <a href={`tel:${resource.phone.replace(/[^0-9]/g, '')}`}>
              Call {resource.phone}
            </a>
          </Button>
        )}
        {resource.action && (
          <span className="text-xs font-medium text-osu-scarlet bg-osu-scarlet/5 px-2 py-1 rounded">
            {resource.action}
          </span>
        )}
      </div>
    </div>
  </div>
);

export default function VictimServices() {
  const [showVictimAI, setShowVictimAI] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [showResourceDiscovery, setShowResourceDiscovery] = useState(false);
  const [isSignedUp, setIsSignedUp] = useState(false);

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "MedicalWebPage",
    "name": SITE_CONFIG.services.healing,
    "description": "Comprehensive support for crime victims: crisis intervention, advocacy, legal aid, and trauma-informed healing resources",
    "url": `${SITE_CONFIG.baseUrl}/victim-services`,
    "medicalAudience": [
      {
        "@type": "MedicalAudience",
        "name": "Crime Victims and Survivors"
      }
    ],
    "about": {
      "@type": "MedicalCondition",
      "name": "Trauma Recovery"
    },
    "provider": {
      "@type": "Organization",
      "name": SITE_CONFIG.name
    }
  };

  const handleSignup = () => {
    setIsSignedUp(true);
    toast({ title: "Welcome!", description: "You now have access to all resources and features." });
  };

  const supportPaths = [
    {
      icon: MessageSquare,
      title: "Crisis Intervention",
      description: "Immediate support for safety and stabilization.",
      color: "text-red-600",
      bgColor: "bg-red-50",
      resources: [
        { title: "National Domestic Violence Hotline", description: "24/7 confidential support for domestic violence survivors", type: "Crisis", phone: "1-800-799-7233" },
        { title: "Crisis Text Line", description: "Free crisis support via text message", type: "Crisis", action: "Text HOME to 741741" },
        { title: "988 Suicide & Crisis Lifeline", description: "24/7 free and confidential support", type: "Emergency", phone: "988" }
      ]
    },
    {
      icon: Scale,
      title: "Legal Advocacy",
      description: "Navigate the justice system with expert help.",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      resources: [
        { title: "Ohio Legal Aid", description: "Free legal assistance for low-income Ohioans", type: "Legal", url: "https://www.ohiolegalhelp.org" },
        { title: "Victim Rights Law Center", description: "Legal services for sexual assault survivors", type: "Legal", url: "https://www.victimrights.org" },
        { title: "VINELink", description: "Offender custody status notification", type: "Safety", url: "https://vinelink.com" }
      ]
    },
    {
      icon: DollarSign,
      title: "Financial Recovery",
      description: "Access compensation and emergency funds.",
      color: "text-green-600",
      bgColor: "bg-green-50",
      resources: [
        { title: "Ohio Victim Compensation", description: "Financial help for crime-related expenses", type: "Compensation", url: "https://www.ohioattorneygeneral.gov/Individuals-and-Families/Victims/Victims-Compensation-Application" },
        { title: "National Center for Victims of Crime", description: "Financial planning and recovery resources", type: "Financial", url: "https://victimsofcrime.org" }
      ]
    },
    {
      icon: Heart,
      title: "Healing & Wellness",
      description: "Long-term recovery and community connection.",
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      resources: [
        { title: "Trauma Recovery Network", description: "Find specialized trauma therapists", type: "Therapy", url: "https://www.traumarecoverynetwork.org" },
        { title: "NAMI Ohio", description: "Mental health support groups and education", type: "Support", url: "https://namiohio.org" }
      ]
    }
  ];

  return (
    <>
      <SEOHead
        title={`Trauma-Informed Digital Sanctuary | ${SITE_CONFIG.services.healing}`}
        description="A safe, trauma-informed digital sanctuary providing somatic release, guided journaling, and Ohio trauma recovery tools. Empowering survivors on their healing journey."
        path="/victim-services"
      />
      <StructuredData data={structuredData} />
      <BreadcrumbSchema crumbs={[{ name: 'Victim Services', path: '/victim-services' }]} />
      
      <main id="main" className="min-h-screen bg-gradient-to-br from-background via-background to-osu-gray/5">
        {/* Hero Section */}
        <header className="relative bg-gradient-osu-primary text-white overflow-hidden pb-20">
          <div className="absolute inset-0 bg-gradient-to-br from-osu-gray-dark/90 via-osu-scarlet/80 to-osu-scarlet-dark/90 mix-blend-multiply"></div>
          <div className="absolute inset-0 opacity-10 mix-blend-overlay bg-gradient-to-tr from-white/5 to-transparent"></div>

          <div className="relative container py-24 md:py-32">
            <div className="max-w-4xl mx-auto text-center space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-sm font-medium tracking-wide animate-fade-in">
                <Shield className="h-4 w-4" />
                <span>The Healing Hub & Sanctuary</span>
              </div>

              <h1 className="font-heading text-4xl md:text-6xl lg:text-7xl font-bold leading-tight tracking-tight">
                Your Safe Space for <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white/90 to-white/70">Release & Recovery</span>
              </h1>

              <p className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto leading-relaxed font-light">
                A trauma-informed digital sanctuary designed for Ohio survivors.
                Access clinically-grounded tools for stabilization, reflection, and connection—at your own pace, on your own terms.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
                <Button 
                  size="lg" 
                  className="get-involved-gold-button border-none shadow-xl px-8 py-6 text-lg"
                  onClick={() => setShowVictimAI(true)}
                >
                  <Bot className="h-5 w-5 mr-2" />
                  Ask Coach Kay
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  className="bg-white/10 backdrop-blur-sm border-white/30 text-white hover:bg-white/20 px-8 py-6 text-lg"
                  onClick={() => {
                    document.getElementById('toolkit')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  Explore Healing Tools
                </Button>
              </div>
            </div>
          </div>

          {/* Curved divider */}
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-b from-transparent to-background/5"></div>
        </header>

        {/* Daily Healing Toolkit (The "Sanctuary") */}
        <div id="toolkit" className="relative -mt-16 z-10">
          <DailyHealingToolkit />
        </div>

        {/* Professional Support Section (Refactored) */}
        <section className="py-24 bg-gradient-to-b from-background to-secondary/5">
          <div className="container max-w-7xl mx-auto px-4">
            <div className="text-center mb-16 space-y-4">
              <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground">
                Professional & Community Support
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Beyond self-guided tools, connect with specialized organizations and resources tailored to your needs.
              </p>

              {/* Added Resource Discovery Button */}
              <div className="pt-4">
                <Button
                  variant="outline"
                  className="gap-2 border-osu-scarlet/20 text-osu-scarlet hover:bg-osu-scarlet/5"
                  onClick={() => setShowResourceDiscovery(true)}
                >
                  <Search className="h-4 w-4" />
                  Search Local Ohio Resources
                </Button>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {supportPaths.map((path, index) => {
                const Icon = path.icon;
                return (
                  <Card key={index} className="border-0 shadow-lg bg-white/50 backdrop-blur-sm overflow-hidden hover:shadow-xl transition-all duration-300">
                    <CardHeader className="border-b border-gray-100 bg-white/50 pb-4">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${path.bgColor} ${path.color}`}>
                          <Icon className="h-6 w-6" />
                        </div>
                        <div>
                          <CardTitle className="text-xl font-bold text-foreground">{path.title}</CardTitle>
                          <CardDescription className="mt-1">{path.description}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6 bg-white/30">
                      <div className="space-y-4">
                        {path.resources.map((resource, idx) => (
                          <ResourceCard key={idx} resource={resource} />
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* Community & Connection Banner */}
        <section className="py-16 container">
          <div className="relative rounded-3xl overflow-hidden shadow-2xl isolate">
            <div className="absolute inset-0">
               <img
                  src={healingCommunityImage}
                  alt="Supportive community"
                  className="w-full h-full object-cover opacity-30"
                />
               <div className="absolute inset-0 bg-gradient-to-r from-osu-scarlet-dark/90 to-osu-gray-dark/90 mix-blend-multiply" />
            </div>

            <div className="relative px-6 py-24 sm:px-12 sm:py-32 lg:px-16 text-center max-w-3xl mx-auto space-y-8">
              <h2 className="text-3xl font-heading font-bold tracking-tight text-white sm:text-4xl">
                You Don't Have to Walk Alone
              </h2>
              <p className="text-lg leading-8 text-white/90 font-light">
                Join a community of survivors and advocates committed to healing, growth, and systemic change.
                Your story matters, and your voice deserves to be heard.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mt-8">
                <Button 
                  size="lg" 
                  className="bg-white text-osu-scarlet hover:bg-white/90 font-bold px-8 shadow-lg"
                  onClick={() => setShowSignupModal(true)}
                >
                  <Users className="h-5 w-5 mr-2" />
                  Join the Community
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  className="border-white/30 text-white hover:bg-white/10"
                  onClick={() => setShowVictimAI(true)}
                >
                  Chat with Support
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Modals */}
      <AiErrorBoundary>
        <VictimSupportAI isOpen={showVictimAI} onClose={() => setShowVictimAI(false)} />
      </AiErrorBoundary>

      <SignupModal
        isOpen={showSignupModal}
        onClose={() => setShowSignupModal(false)}
        onSignup={handleSignup}
      />

      <AiErrorBoundary>
        <AIResourceDiscovery
          isOpen={showResourceDiscovery}
          onClose={() => setShowResourceDiscovery(false)}
          initialQuery="support groups near me"
          location="Ohio"
        />
      </AiErrorBoundary>
    </>
  );
}