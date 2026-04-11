import React from "react";
import { SEOHead } from "@/components/seo/SEOHead";
import { SITE_CONFIG } from "@/config/site";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAnalyticsContext } from "@/components/layout/AnalyticsProvider";
import { StructuredData } from "@/components/seo/StructuredData";
import { BreadcrumbSchema } from "@/components/seo/BreadcrumbSchema";
import { SUPPORT_EMAIL } from "@/config/contact";
import {
  CareerQuizGame,
  ComparisonGame,
  BudgetGame,
  TriviaGame
} from "@/components/youth/YouthGames";
import {
  Rocket,
  Target,
  Users,
  Shield,
  Briefcase,
  Calendar,
  Mail,
  Phone,
  ArrowRight,
  GraduationCap,
  Sparkles,
  Zap,
  CheckCircle2,
  DollarSign
} from "lucide-react";

export default function YouthFutures() {
  const { trackClick, trackConversion } = useAnalyticsContext();

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'Who is the Youth Futures program for?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Youth Futures is for justice-impacted or community-referred youth in two groups: ages 14-20 and ages 21-25. 20-year-olds should apply to the 21-25 group.'
        }
      },
      {
        '@type': 'Question',
        name: 'How much does it cost youth participants?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Participation is 100% free for youth participants.'
        }
      },
      {
        '@type': 'Question',
        name: 'How can organizations partner?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Organizations can partner by submitting a request through the Partner With Us call to action.'
        }
      }
    ]
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Youth Futures Elevation Program | Empowerment for Justice-Impacted Youth"
        description="AI-powered career tools and mentorship for justice-impacted youth in two groups: ages 14-20 and 20-25. 100% free participation powered by sponsors."
        path="/youth-futures"
      />
      <StructuredData data={faqSchema} />
      <BreadcrumbSchema crumbs={[{ name: 'Youth Futures', path: '/youth-futures' }]} />

      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden bg-white border-b border-osu-gray-light/60">
        <div className="container px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6 animate-fade-in">
              <Badge className="bg-osu-scarlet text-white hover:bg-osu-scarlet/90 px-4 py-1">Ages 14-20 & 20-25</Badge>
              <h1 className="font-heading text-4xl md:text-6xl font-bold text-foreground leading-tight">
                Youth Futures <br />
                <span className="text-osu-scarlet">Elevation Program</span>
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed">
                AI-powered career tools and mentorship for justice-impacted youth in two groups: ages 14-20 and 20-25.
                Build your future with cutting-edge technology and community support.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button className="get-involved-gold-button h-12 px-8" asChild>
                  <a href="#apply" onClick={() => trackClick('youth_futures_hero_apply_anchor')}>Apply Now <ArrowRight className="ml-2 h-5 w-5" /></a>
                </Button>
                <Button variant="outline" className="h-12 px-8 border-osu-scarlet text-osu-scarlet hover:bg-osu-scarlet hover:text-white" asChild>
                  <a href="#games" onClick={() => trackClick('youth_futures_hero_games_anchor')}>Try the Games</a>
                </Button>
              </div>
            </div>
            <div className="relative rounded-2xl overflow-hidden shadow-sm border border-osu-gray-light/70">
              <img
                src="https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&q=80"
                alt="Youth working on laptop"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-osu-gray-dark/35 to-transparent"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Intro Section */}
      <section className="py-16 bg-white">
        <div className="container px-4 max-w-4xl text-center">
          <p className="text-2xl font-medium text-foreground leading-relaxed italic">
            "Forward Focus Elevation's Youth Futures Program equips young people with
            cutting-edge AI tools to build careers, master finances, and create opportunities.
            100% free for youth participants. Powered by organizational sponsors and grants."
          </p>
        </div>
      </section>

      {/* Programs Section */}
      <section className="py-20 bg-background">
        <div className="container px-4">
          <div className="text-center mb-16">
            <h2 className="font-heading text-3xl md:text-4xl font-bold mb-4">Three Program Pathways</h2>
            <div className="h-1.5 w-24 bg-osu-scarlet mx-auto rounded-full"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="pro-card border-2 hover:border-osu-scarlet/50 transition-all duration-300">
              <CardHeader className="text-center space-y-2">
                <div className="w-12 h-12 bg-osu-scarlet/10 rounded-full flex items-center justify-center mx-auto">
                  <Rocket className="h-6 w-6 text-osu-scarlet" />
                </div>
                <CardTitle className="text-xl font-bold">Weekend Accelerator</CardTitle>
                <Badge variant="secondary">3-Day Intensive</Badge>
              </CardHeader>
              <CardContent className="space-y-6">
                <ul className="space-y-3 text-sm">
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-osu-scarlet" /> 8 AI career tools</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-osu-scarlet" /> Resume & LinkedIn</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-osu-scarlet" /> Budget mastery</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-osu-scarlet" /> Business ideation</li>
                </ul>

              </CardContent>
            </Card>

            <Card className="pro-card border-2 hover:border-osu-scarlet/50 transition-all duration-300">
              <CardHeader className="text-center space-y-2">
                <div className="w-12 h-12 bg-osu-scarlet/10 rounded-full flex items-center justify-center mx-auto">
                  <Target className="h-6 w-6 text-osu-scarlet" />
                </div>
                <CardTitle className="text-xl font-bold">6-Week Intensive</CardTitle>
                <Badge className="bg-osu-scarlet text-white">Thursday Evenings</Badge>
              </CardHeader>
              <CardContent className="space-y-6">
                <ul className="space-y-3 text-sm">
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-osu-scarlet" /> 14 advanced AI tools</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-osu-scarlet" /> Job search support</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-osu-scarlet" /> Weekly mentorship</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-osu-scarlet" /> Interview training</li>
                </ul>

              </CardContent>
            </Card>

            <Card className="pro-card border-2 hover:border-osu-scarlet/50 transition-all duration-300">
              <CardHeader className="text-center space-y-2">
                <div className="w-12 h-12 bg-osu-scarlet/10 rounded-full flex items-center justify-center mx-auto">
                  <Sparkles className="h-6 w-6 text-osu-scarlet" />
                </div>
                <CardTitle className="text-xl font-bold">Complete Elevation</CardTitle>
                <Badge variant="secondary">12-Week Transformation</Badge>
              </CardHeader>
              <CardContent className="space-y-6">
                <ul className="space-y-3 text-sm">
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-osu-scarlet" /> All 23 premium tools</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-osu-scarlet" /> Personal mentor</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-osu-scarlet" /> Family support</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-osu-scarlet" /> Lifetime access</li>
                </ul>

              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Games Section */}
      <section id="games" className="py-20 bg-white">
        <div className="container px-4">
          <div className="text-center mb-16">
            <h2 className="font-heading text-3xl md:text-4xl font-bold mb-4">Level Up Your Skills</h2>
            <p className="text-muted-foreground">Interactive mini-games to jumpstart your career journey.</p>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 max-w-6xl mx-auto">
            <CareerQuizGame />
            <ComparisonGame />
            <BudgetGame />
            <TriviaGame />
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="apply" className="py-20 bg-osu-gray-dark text-white">
        <div className="container px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 divide-y md:divide-y-0 md:divide-x divide-white/20">
            <div className="space-y-6 pb-8 md:pb-0">
              <h2 className="text-3xl font-bold">For Youth</h2>
              <ul className="space-y-4 text-lg opacity-90">
                <li className="flex items-center gap-3"><Zap className="h-5 w-5 pro-list-icon" /> 100% FREE to participate</li>
                <li className="flex items-center gap-3"><Users className="h-5 w-5 pro-list-icon" /> Age Group 1: 14-20</li>
                <li className="flex items-center gap-3"><Users className="h-5 w-5 pro-list-icon" /> Age Group 2: 20-25</li>
                <li className="flex items-center gap-3"><Shield className="h-5 w-5 pro-list-icon" /> Justice-impacted or community-referred</li>
                <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 pro-list-icon" /> Apply online in minutes</li>
              </ul>
              <Button size="lg" className="get-involved-gold-button border-none w-full sm:w-auto h-14 text-lg" asChild>
                <a
                  href="/youth-application"
                  onClick={() => {
                    trackClick('youth_futures_apply_now');
                    trackConversion('youth_application_interest', { source: 'youth_futures_apply_section' });
                  }}
                >
                  Youth: Apply Now
                </a>
              </Button>
            </div>
            <div className="space-y-6 pt-8 md:pt-0 md:pl-12">
              <h2 className="text-3xl font-bold">For Organizations</h2>
              <ul className="space-y-4 text-lg opacity-90">
                <li className="flex items-center gap-3"><Briefcase className="h-5 w-5 pro-list-icon" /> Sponsor youth through your organization</li>
                <li className="flex items-center gap-3"><Users className="h-5 w-5 pro-list-icon" /> Schools, nonprofits, courts, faith-based</li>
                <li className="flex items-center gap-3"><DollarSign className="h-5 w-5 pro-list-icon" /> Tax-deductible support</li>
                <li className="flex items-center gap-3"><Calendar className="h-5 w-5 pro-list-icon" /> Impact reporting included</li>
              </ul>
              <Button size="lg" className="get-involved-gold-button border-none w-full sm:w-auto h-14 text-lg" asChild>
                <a
                  href="/partners/request"
                  onClick={() => {
                    trackClick('youth_futures_partner_with_us');
                    trackConversion('partner_interest', { source: 'youth_futures_apply_section' });
                  }}
                >
                  Partner With Us
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-20 bg-white">
        <div className="container px-4 max-w-4xl">
          <Card className="border-4 border-osu-scarlet/20 bg-cream/30">
            <CardContent className="p-12 text-center space-y-8">
              <h2 className="font-heading text-4xl font-bold">Questions about Youth Futures?</h2>
              <div className="flex flex-col md:flex-row gap-8 justify-center items-center">
                <div className="flex items-center gap-3 text-lg">
                  <Mail className="h-6 w-6 text-osu-scarlet" />
                  <a href={`mailto:${SUPPORT_EMAIL}`} className="hover:text-osu-scarlet transition-colors" onClick={() => trackClick('youth_futures_contact_email')}>{SUPPORT_EMAIL}</a>
                </div>
                <div className="flex items-center gap-3 text-lg">
                  <Phone className="h-6 w-6 text-osu-scarlet" />
                  <a href="tel:3802877936" className="hover:text-osu-scarlet transition-colors" onClick={() => trackClick('youth_futures_contact_phone')}>380-287-7936</a>
                </div>
              </div>
              <Button size="lg" className="get-involved-gold-button border-none h-14 px-12 text-lg" asChild>
                <a href="https://calendly.com/ffe_coach_kay/free-call" target="_blank" rel="noopener noreferrer" onClick={() => { trackClick('youth_futures_schedule_info_call'); trackConversion('youth_info_call', { source: 'youth_futures_contact_section' }); }}>
                  Schedule Info Call
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
