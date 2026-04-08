import React from 'react';
import { Award, CheckCircle, Target, Users, Shield, Star, Zap, Brain, Sparkles, Linkedin, Mail } from 'lucide-react';

const FounderOnePager = () => {
  return (
    <div className="founder-one-pager bg-white p-8 md:p-12 border border-osu-gray-light/70 shadow-sm max-w-4xl mx-auto print-card print:shadow-none print:border-none print:p-0">
      <style>{`
        @media print {
          @page { size: 5.5in 8.5in; margin: 0.25in; }
          body { margin: 0; background: white; }
          .print-card {
            width: 100%;
            max-width: none;
            min-height: auto;
            margin: 0;
            padding: 18px !important;
            border: none !important;
            box-shadow: none !important;
            break-inside: avoid;
            page-break-inside: avoid;
          }
          .print-card section,
          .print-card div {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b-2 border-osu-scarlet pb-8 mb-8 gap-6">
        <div>
          <h1 className="text-4xl font-heading font-bold text-foreground mb-2">Coach Kay</h1>
          <p className="text-xl font-semibold text-osu-scarlet uppercase tracking-widest">AI Life Transformation Coach</p>
          <p className="text-sm text-muted-foreground mt-1 font-medium">Founder, Forward Focus Elevation</p>
        </div>
        <div className="bg-osu-scarlet text-white p-4 rounded-xl text-center md:w-48 shadow-sm">
          <p className="text-[10px] uppercase font-bold tracking-tighter opacity-80 mb-1">Accredited Expertise</p>
          <p className="text-sm font-bold leading-tight">Master Certified Coach & AI Consultant</p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid md:grid-cols-2 gap-12">
        {/* Left Column: Mission & Story */}
        <div className="space-y-8">
          <section>
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-osu-scarlet mb-4 flex items-center gap-2">
              <Target className="h-4 w-4" /> The Mission
            </h2>
            <p className="text-lg text-foreground leading-relaxed italic border-l-4 border-osu-gray/10 pl-4 py-2">
              "To create a trauma-informed, AI-powered ecosystem where justice-impacted families rebuild with dignity and write their next chapter with hope."
            </p>
          </section>

          <section>
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-osu-scarlet mb-4 flex items-center gap-2">
              <Star className="h-4 w-4" /> Core Philosophy
            </h2>
            <p className="text-sm text-foreground/80 leading-relaxed mb-4">
              Forward Focus Elevation combines **Mindfulness-Based Transformation** with **Cutting-Edge AI Navigation**. We believe technology is the ultimate equalizer for those seeking second chances.
            </p>
            <ul className="grid grid-cols-1 gap-3">
              {[
                "Dignity-First Resource Navigation",
                "Trauma-Informed Digital Sanctuary",
                "Strategic AI Life Transformation",
                "88-County Ohio Resource Network"
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <CheckCircle className="h-3 w-3 text-osu-scarlet" /> {item}
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* Right Column: Accreditations & Experience */}
        <div className="bg-background p-8 rounded-2xl border border-osu-gray-light/70 space-y-8">
          <section>
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-osu-scarlet mb-4 flex items-center gap-2">
              <Award className="h-4 w-4" /> Professional Certifications
            </h2>
            <div className="space-y-4">
              <div className="flex gap-3 items-start">
                <div className="p-2 bg-white rounded-lg border border-osu-gray-light/60"><Sparkles className="h-4 w-4 text-osu-scarlet" /></div>
                <div>
                  <p className="text-sm font-bold text-foreground">Master Certified Coach</p>
                  <p className="text-[10px] text-muted-foreground leading-tight">Transformation, Mindfulness, Life Purpose, Goal Setting, & Happiness</p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <div className="p-2 bg-white rounded-lg border border-osu-gray-light/60"><Brain className="h-4 w-4 text-osu-scarlet" /></div>
                <div>
                  <p className="text-sm font-bold text-foreground">Accredited AI Consultant</p>
                  <p className="text-[10px] text-muted-foreground leading-tight">Strategic Implementation for Nonprofits & Social Enterprise</p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <div className="p-2 bg-white rounded-lg border border-osu-gray-light/60"><Zap className="h-4 w-4 text-osu-scarlet" /></div>
                <div>
                  <p className="text-sm font-bold text-foreground">Accredited AI Prompt Engineer</p>
                  <p className="text-[10px] text-muted-foreground leading-tight">Human-Centric AI Design & Interactive Support Logic</p>
                </div>
              </div>
            </div>
          </section>

          <section className="pt-4 border-t border-osu-gray/10">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-osu-scarlet mb-4 flex items-center gap-2">
              <Linkedin className="h-4 w-4" /> Contact & Partnership
            </h2>
            <div className="space-y-2 text-xs font-medium text-foreground">
              <div className="flex items-center gap-2"><Mail className="h-3 w-3 text-muted-foreground" /> support@ffeservices.net</div>
              <div className="flex items-center gap-2 font-bold"><Award className="h-3 w-3 text-muted-foreground" /> forward-focus-elevation.org</div>
              <div className="mt-4 pt-4 text-[10px] text-muted-foreground text-center italic">
                Empowering Justice-Impacted Families with the Tools to Rebuild and Thrive.
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Print-only footer */}
      <div className="hidden print:block mt-6 text-center text-[10px] text-muted-foreground border-t pt-4">
        © 2024 Forward Focus Elevation. All Rights Reserved. Accredited AI Transformation Hub.
      </div>
    </div>
  );
};

export default FounderOnePager;
