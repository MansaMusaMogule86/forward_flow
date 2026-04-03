import React, { useState } from "react";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Home, Briefcase, GraduationCap, Heart, Scale, DollarSign, Bot, ArrowRight, ShieldCheck, CheckCircle2 } from "lucide-react";
import ReentryNavigatorAI from "@/components/ai/ReentryNavigatorAI";
import { SEOHead } from "@/components/seo/SEOHead";

const Reentry = () => {
  const [isNavigatorOpen, setIsNavigatorOpen] = useState(false);
  const [initialQuery, setInitialQuery] = useState("");

  const handleStartNavigating = (query: string = "") => {
    setInitialQuery(query);
    setIsNavigatorOpen(true);
  };

  const reentryNeeds = [
    {
      title: "Fair-Chance Employment",
      description: "Connect with employers who value your skills and offer a second chance.",
      icon: Briefcase,
      color: "text-blue-600",
      bg: "bg-blue-50",
      query: "Help me find fair-chance employers in Ohio"
    },
    {
      title: "Transitional Housing",
      description: "Find safe, stable housing options that accept individuals with background records.",
      icon: Home,
      color: "text-green-600",
      bg: "bg-green-50",
      query: "I need transitional housing options"
    },
    {
      title: "Legal & Record Relief",
      description: "Navigate expungement, rights restoration, and legal obligations with expert guidance.",
      icon: Scale,
      color: "text-purple-600",
      bg: "bg-purple-50",
      query: "How can I clear my record or get expungement support?"
    },
    {
      title: "Family Reconnection",
      description: "Resources for rebuilding trust and healthy relationships after absence.",
      icon: Heart,
      color: "text-red-600",
      bg: "bg-red-50",
      query: "Help me with family reconnection and communication"
    }
  ];

  const valueProps = [
    { title: "Justice-Friendly", description: "Every resource is vetted for individuals with backgrounds.", icon: ShieldCheck },
    { title: "AI-Powered Navigator", description: "Coach Kay is available 24/7 to guide your journey.", icon: Bot },
    { title: "Personalized Support", description: "Tailored advice based on your specific reentry stage.", icon: CheckCircle2 }
  ];

  return (
    <Layout>
      <SEOHead 
        title="Reentry Navigator | Second Chances Start Here" 
        description="Forward Focus Foundation's AI-powered Reentry Navigator provides justice-friendly resources for housing, employment, and legal support in Ohio."
        path="/reentry"
      />
      
      <main id="main" className="min-h-screen bg-slate-50">
        <section className="relative py-20 overflow-hidden bg-navy text-white">
          <div className="absolute inset-0 opacity-10 bg-[url('https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&q=80')] bg-cover bg-center" />
          <div className="container relative z-10 px-4 mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 text-sm font-medium rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
              <Bot className="h-4 w-4 text-osu-scarlet" />
              <span>AI-Powered Success Hub</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-display font-bold mb-6 tracking-tight">
              Your Journey to a <span className="text-osu-scarlet">Second Chance</span> Starts Now
            </h1>
            <p className="text-xl md:text-2xl text-slate-300 max-w-2xl mx-auto mb-10 font-sans">
              Navigate the challenges of reentry with personalized, justice-friendly resources and the support of Coach Kay.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button 
                size="lg" 
                className="bg-osu-scarlet hover:bg-osu-scarlet/90 text-white px-8 h-12 text-lg rounded-full font-bold"
                onClick={() => handleStartNavigating()}
              >
                Start Your Navigation
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="border-white/20 text-white hover:bg-white/10 px-8 h-12 text-lg rounded-full"
                onClick={() => {
                  const element = document.getElementById('priority-needs');
                  element?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                Explore Resources
              </Button>
            </div>
          </div>
        </section>

        <section className="py-16 bg-white border-b">
          <div className="container px-4 mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {valueProps.map((prop, idx) => (
                <div key={idx} className="flex gap-4 items-start">
                  <div className="p-3 bg-slate-100 rounded-xl">
                    <prop.icon className="h-6 w-6 text-navy" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-1">{prop.title}</h3>
                    <p className="text-slate-600 text-sm leading-relaxed">{prop.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="priority-needs" className="py-20">
          <div className="container px-4 mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl md:text-4xl font-display font-bold mb-4 text-navy">How Can We Support You Today?</h2>
              <p className="text-lg text-slate-600">Select a priority area to begin personalized navigation with our AI experts.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {reentryNeeds.map((need, idx) => (
                <Card key={idx} className="group hover:shadow-xl transition-all duration-300 border-slate-200">
                  <CardHeader className={`${need.bg} rounded-t-lg pb-8`}>
                    <div className={`p-4 bg-white rounded-2xl shadow-sm w-fit mb-4 group-hover:scale-110 transition-transform duration-300`}>
                      <need.icon className={`h-8 w-8 ${need.color}`} />
                    </div>
                    <CardTitle className="text-navy">{need.title}</CardTitle>
                    <CardDescription className="text-slate-700 min-h-[3rem] line-clamp-2">
                      {need.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <Button 
                      variant="ghost" 
                      className="w-full justify-between group-hover:bg-slate-50 text-navy"
                      onClick={() => handleStartNavigating(need.query)}
                    >
                      Get Help Now
                      <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 bg-slate-900 text-white">
          <div className="container px-4 mx-auto">
            <div className="flex flex-col lg:flex-row items-center gap-12">
              <div className="lg:w-1/2">
                <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 text-sm font-medium rounded-full bg-osu-scarlet/20 text-osu-scarlet border border-osu-scarlet/30">
                  <Scale className="h-4 w-4" />
                  <span>Fair Chance Advocacy</span>
                </div>
                <h2 className="text-3xl md:text-5xl font-display font-bold mb-6">Advocating for Your <span className="text-osu-scarlet">Rights</span></h2>
                <div className="space-y-4 text-slate-300 text-lg mb-8">
                  <p>
                    Our Reentry Navigator is more than just a search tool. It's a comprehensive platform built to level the playing field.
                  </p>
                  <div className="flex gap-3 items-start">
                    <CheckCircle2 className="h-6 w-6 text-osu-scarlet flex-shrink-0 mt-1" />
                    <span>Access to verified fair-chance employers in all 88 Ohio counties.</span>
                  </div>
                  <div className="flex gap-3 items-start">
                    <CheckCircle2 className="h-6 w-6 text-osu-scarlet flex-shrink-0 mt-1" />
                    <span>Direct links to expungement clinics and legal aid foundations.</span>
                  </div>
                  <div className="flex gap-3 items-start">
                    <CheckCircle2 className="h-6 w-6 text-osu-scarlet flex-shrink-0 mt-1" />
                    <span>Personalized roadmap for housing stability and professional growth.</span>
                  </div>
                </div>
                <Button 
                  size="lg" 
                  className="bg-white text-navy hover:bg-slate-200 px-8 rounded-full font-bold"
                  onClick={() => handleStartNavigating("Tell me about my legal rights and expungement options in Ohio")}
                >
                  Learn About Your Rights
                </Button>
              </div>
              <div className="lg:w-1/2 relative">
                <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-white/10">
                  <img 
                    src="https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&q=80" 
                    alt="Team collaboration" 
                    className="w-full object-cover aspect-video"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent" />
                  <div className="absolute bottom-6 left-6 right-6 p-6 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
                    <p className="text-white font-medium italic">
                      "The Reentry Navigator helped me find housing when every other door was being slammed. Coach Kay kept me motivated when I wanted to give up."
                    </p>
                    <p className="text-osu-scarlet font-bold mt-2">— Marcus R., Success Story Participant</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <ReentryNavigatorAI 
        isOpen={isNavigatorOpen} 
        onClose={() => setIsNavigatorOpen(false)} 
        initialQuery={initialQuery}
      />
    </Layout>
  );
};

export default Reentry;
