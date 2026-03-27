import { useState, useEffect } from "react";
import { BookOpen, CheckCircle, Users, MessageSquare, MapPin, Phone, FileText, DollarSign, Heart, Brain, GraduationCap, Home, Briefcase, Scale, HeartHandshake, PiggyBank, Shield, Bot, Target, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { VettingQuestionnaire } from "@/components/learn/VettingQuestionnaire";
import { PathwayVisual } from "@/components/learn/PathwayVisual";
import ReentryNavigatorAI from "@/components/ai/ReentryNavigatorAI";
import { SEOHead } from "@/components/seo/SEOHead";
import { StructuredData } from "@/components/seo/StructuredData";
import { BreadcrumbSchema } from "@/components/seo/BreadcrumbSchema";
import { SITE_CONFIG } from "@/config/site";

export default function CommunityLearning() {
  const [showVetting, setShowVetting] = useState(false);
  const [showReentryAI, setShowReentryAI] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedCoach, setSelectedCoach] = useState<{
    name: string;
    specialty: string;
    description: string;
  } | undefined>(undefined);

  useEffect(() => {
    // Simulate initial load
    const timer = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  const supportCoaches = [
    {
      name: "Coach Dana",
      specialty: "Housing Transition",
      description: "I help you find safe, stable housing and navigate the rental process with confidence",
      icon: Home
    },
    {
      name: "Coach Malik", 
      specialty: "Employment Support",
      description: "From resume building to interview prep, I'm here to help you land meaningful work",
      icon: Briefcase
    },
    {
      name: "Coach Rivera",
      specialty: "Legal Guidance",
      description: "Let's tackle court obligations, expungement, and legal paperwork together",
      icon: Scale
    },
    {
      name: "Coach Taylor",
      specialty: "Family Support",
      description: "Rebuilding relationships takes time. I'll guide you through every conversation",
      icon: HeartHandshake
    },
    {
      name: "Coach Jordan",
      specialty: "Financial Stability",
      description: "Banking, budgeting, credit repair - we'll build your financial foundation step by step",
      icon: PiggyBank
    },
    {
      name: "Coach Sam",
      specialty: "Mental Wellness",
      description: "Your mental health matters. I'm here to support your healing journey",
      icon: Brain
    }
  ];

  const learningGroups = {
    "Mind & Healing": [
      {
        title: "Welcome Rest Your Path",
        description: "Begin your healing journey with trauma informed practices and community connection",
        icon: Heart
      },
      {
        title: "Clarity Support & Wellness",
        description: "Mental health resources, mindfulness practices, and emotional wellness tools", 
        icon: Brain
      }
    ],
    "Money & Business": [
      {
        title: "Financial Foundations", 
        description: "Banking basics, budgeting strategies, and financial literacy for stability",
        icon: DollarSign
      },
      {
        title: "Credit Confidence",
        description: "Build and repair credit, understand credit reports, and establish financial trust",
        icon: CheckCircle
      },
      {
        title: "Business Essentials", 
        description: "Entrepreneurship fundamentals, business planning, and creating your own opportunities",
        icon: Users
      }
    ],
    "Skills for Life After Release": [
      {
        title: "AI Basics Training",
        description: "Learn how AI can support your reentry journey and daily life navigation",
        icon: GraduationCap
      },
      {
        title: "Reentry & Life Tools Vault",
        description: "Practical resources for housing, employment, documentation, and system navigation",
        icon: FileText
      },
      {
        title: "Purpose Planning & Pathways",
        description: "Goal setting, life planning, and creating sustainable pathways forward",
        icon: MapPin
      }
    ]
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background font-sans">
        {/* Hero Skeleton */}
        <header className="relative bg-gradient-osu-primary text-white overflow-hidden">
          <div className="relative container py-24 md:py-32">
            <div className="max-w-full px-4 md:max-w-5xl mx-auto text-center space-y-8">
              <Skeleton className="h-8 w-32 mx-auto bg-white/20" />
              <Skeleton className="h-16 w-3/4 mx-auto bg-white/20" />
              <Skeleton className="h-6 w-2/3 mx-auto bg-white/20" />
              <div className="flex justify-center gap-4">
                <Skeleton className="h-12 w-32 bg-white/20" />
                <Skeleton className="h-12 w-32 bg-white/20" />
                <Skeleton className="h-12 w-32 bg-white/20" />
              </div>
              <Skeleton className="h-12 w-64 mx-auto bg-white/20" />
            </div>
          </div>
        </header>

        <main className="container py-24 space-y-16">
          <div className="max-w-6xl mx-auto px-4">
            {/* Coaches Grid Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="p-6">
                  <div className="flex items-start gap-4">
                    <Skeleton className="h-12 w-12 rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-6 w-24" />
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-16 w-full" />
                      <Skeleton className="h-8 w-20" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Learning Groups Skeleton */}
            <div className="space-y-8">
              <Skeleton className="h-12 w-64 mx-auto" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(8)].map((_, i) => (
                  <Card key={i} className="p-6 space-y-4">
                    <Skeleton className="h-12 w-12 rounded-xl" />
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-16 w-full" />
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-sans">
      <SEOHead
        title={`${SITE_CONFIG.services.collective} | AI & Life Transformation Hub`}
        description="Welcome to The Collective. Access AI-powered life transformation tools, educational modules, and personalized coaching for justice-impacted individuals and families."
        path="/learn"
      />
      <StructuredData data={{
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        headline: `${SITE_CONFIG.services.collective} | AI & Life Transformation Hub`,
        description: 'Access AI-powered life transformation tools, educational modules, and personalized coaching for justice-impacted individuals and families.',
        url: `${SITE_CONFIG.baseUrl}/learn`,
        datePublished: '2025-01-15',
        dateModified: new Date().toISOString(),
        author: { '@type': 'Person', '@id': `${SITE_CONFIG.baseUrl}/#person-coach-kay` },
        publisher: { '@type': 'Organization', '@id': `${SITE_CONFIG.baseUrl}/#organization` },
        mainEntityOfPage: { '@type': 'WebPage', '@id': `${SITE_CONFIG.baseUrl}/learn` },
      }} />
      <BreadcrumbSchema crumbs={[{ name: 'Learn & Grow', path: '/learn' }]} />
      {/* Hero Section with Premium Branding */}
      <header className="relative bg-gradient-osu-primary text-white overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-muted/90 via-osu-scarlet/80 to-osu-scarlet-dark/70"></div>
        <div className="relative container py-24 md:py-32">
          <div className="max-w-full px-4 md:max-w-5xl mx-auto text-center">
            <div className="flex items-center justify-center gap-3 mb-8">
              <Sparkles className="h-8 w-8 text-white" />
              <span className="text-sm uppercase tracking-widest font-bold bg-white/10 backdrop-blur-md border border-white/30 px-6 py-2 rounded-full shadow-inner">{SITE_CONFIG.services.collective}</span>
            </div>
            <h1 className="font-heading text-5xl md:text-7xl font-bold mb-8 leading-tight">
              AI & Life <br className="hidden md:block" /> Transformation
            </h1>
            <p className="text-lg md:text-2xl mb-12 text-white/90 leading-relaxed max-w-3xl mx-auto font-light">
              The world's first trauma-informed digital ecosystem specifically designed to turn your next chapter into your greatest success story.
            </p>
            
            <div className="flex items-center justify-center gap-6 text-sm mb-12 flex-wrap">
              <span className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 px-6 py-3 rounded-full">
                <Shield className="h-5 w-5" />
                Safe Space
              </span>
              <span className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 px-6 py-3 rounded-full">
                <Heart className="h-5 w-5" />
                Support
              </span>
              <span className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 px-6 py-3 rounded-full">
                <Users className="h-5 w-5" />
                Community
              </span>
            </div>

            <div className="flex justify-center">
              <Button onClick={() => setShowReentryAI(true)} size="lg" className="get-involved-gold-button border-none shadow-xl">
                <Bot className="h-5 w-5 mr-2" />
                Access Your Reentry Navigator
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container py-24 space-y-32 font-body">
        <div className="max-w-full px-4 md:max-w-6xl mx-auto">
          
          {/* Community Visual */}
          <section className="mb-16">
            <PathwayVisual pathway="community" />
          </section>

          {/* Reentry Navigator Section */}
          <section className="bg-gradient-to-r from-osu-gray/10 via-cream/20 to-osu-gray/10 rounded-2xl p-6 md:p-12 shadow-xl">
            <div className="text-center space-y-8">
              <div className="space-y-4">
                <h2 className="font-heading text-4xl md:text-5xl font-bold text-foreground">
                  AI Life Transformation Navigator
                </h2>
                <p className="text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                  Personalized guidance specifically designed for second chances. Get support for housing, employment, legal matters, and mindfulness-based success available 24/7.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 place-items-center max-w-full md:max-w-6xl mx-auto">
                {supportCoaches.map((coach, index) => {
                  const Icon = coach.icon;
                  return (
                    <Card 
                      key={index} 
                      className="w-full max-w-md md:max-w-full mx-auto text-left hover:shadow-xl transition-all duration-300 border-l-4 border-l-osu-scarlet cursor-pointer md:hover:scale-105 bg-white/80 backdrop-blur-sm"
                      onClick={() => {
                        setSelectedCoach({
                          name: coach.name,
                          specialty: coach.specialty,
                          description: coach.description
                        });
                        setShowReentryAI(true);
                      }}
                    >
                      <CardContent className="p-5 md:p-6">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 bg-osu-scarlet rounded-xl flex items-center justify-center flex-shrink-0 mt-1 shadow-lg">
                            <Icon className="h-6 w-6 text-osu-scarlet-foreground" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg text-foreground mb-2">{coach.name}</h3>
                            <p className="text-sm text-osu-scarlet font-medium mb-3">{coach.specialty}</p>
                            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                              {coach.description}
                            </p>
                            <div className="mt-3">
                              <Button size="sm" variant="outline" className="text-xs border-osu-scarlet text-osu-scarlet hover:bg-osu-scarlet hover:text-white">
                                Chat with {coach.name.split(' ')[1]}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Tools for Your Journey Section */}
          <section className="space-y-16">
            <div className="text-center space-y-6">
              <div className="bg-gradient-to-r from-osu-gray/5 via-cream/10 to-osu-gray/5 rounded-2xl p-8">
                <h2 className="font-heading text-4xl md:text-5xl font-bold text-foreground flex items-center justify-center gap-4 mb-6">
                  <BookOpen className="h-10 w-10 text-osu-scarlet" />
                  Tools for Your Journey
                </h2>
                <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                  8 guided learning modules to help you rebuild your life at your pace
                </p>
                <div className="flex items-center justify-center gap-4">
                  <Badge variant="secondary" className="text-sm bg-osu-gray text-osu-gray-foreground px-4 py-2">100% Free</Badge>
                  <Badge variant="secondary" className="text-sm bg-osu-gray text-osu-gray-foreground px-4 py-2">Educational Only</Badge>
                </div>
              </div>
            </div>

            <div className="space-y-16">
              {Object.entries(learningGroups).map(([groupName, modules]) => (
                <div key={groupName} className="bg-gradient-to-r from-cream/20 via-background to-cream/20 rounded-2xl p-8 shadow-lg">
                  <h3 className="text-2xl md:text-3xl font-heading font-semibold text-osu-scarlet mb-8 text-center">
                    {groupName}
                  </h3>
                  <div className={`grid gap-4 md:gap-6 ${modules.length === 2 ? 'grid-cols-1 md:grid-cols-2 max-w-full md:max-w-3xl mx-auto' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 max-w-full md:max-w-5xl mx-auto'}`}>
                    {modules.map((module, index) => {
                      const Icon = module.icon;
                      return (
                        <Card key={index} className="text-left hover:shadow-xl transition-all duration-300 md:hover:scale-105 bg-white/80 backdrop-blur-sm border border-osu-gray/20">
                          <CardHeader className="pb-4">
                            <div className="w-12 h-12 bg-osu-scarlet/10 rounded-xl flex items-center justify-center mb-4 shadow-inner">
                              <Icon className="h-6 w-6 text-osu-scarlet" />
                            </div>
                            <CardTitle className="text-xl leading-tight font-semibold">
                              {module.title}
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {module.description}
                            </p>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center bg-gradient-to-r from-osu-scarlet/5 via-osu-scarlet/10 to-osu-scarlet/5 rounded-2xl p-6 sm:p-12 px-4">
              <Button 
                onClick={() => setShowVetting(true)}
                size="lg"
                className="get-involved-gold-button border-none text-lg px-6 sm:px-12 py-6 shadow-xl w-full max-w-sm sm:max-w-none sm:w-auto"
              >
                Check Your Qualifications
                <ArrowRight className="ml-3 h-6 w-6" />
              </Button>
              <p className="text-foreground/70 text-base mt-4">Direct entry to the <strong>{SITE_CONFIG.services.skool}</strong> (Skool Community) after vetting</p>
            </div>
          </section>
        </div>
      </main>

      {/* Vetting Modal */}
      <VettingQuestionnaire
        isOpen={showVetting}
        onClose={() => setShowVetting(false)}
      />
      
      {/* Reentry Navigator AI */}
      <ReentryNavigatorAI 
        isOpen={showReentryAI} 
        onClose={() => {
          setShowReentryAI(false);
          setSelectedCoach(undefined);
        }}
        selectedCoach={selectedCoach}
      />
    </div>
  );
}