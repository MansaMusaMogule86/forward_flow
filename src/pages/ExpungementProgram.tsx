import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { 
  Shield, Clock, FileCheck, Users, Lock, ArrowRight, 
  CheckCircle, Star, Calendar, Gavel, BadgeCheck, Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SEOHead } from "@/components/seo/SEOHead";

const programFeatures = [
  {
    icon: Gavel,
    title: "Legal Document Preparation",
    description: "Our team prepares all court filings, ensuring 100% accuracy and compliance with Ohio Revised Code 2953.32."
  },
  {
    icon: FileCheck,
    title: "BCII Background Check Handling",
    description: "We obtain and review your official Ohio BCII background check ($22 fee covered in program)."
  },
  {
    icon: Users,
    title: "Attorney Network Access",
    description: "Partnerships with pro-bono and sliding-scale attorneys across all 88 Ohio counties."
  },
  {
    icon: Clock,
    title: "Expedited Processing",
    description: "Priority filing and follow-up reduces average wait time from 6 months to 90-120 days."
  },
  {
    icon: Shield,
    title: "Record Monitoring",
    description: "Post-expungement verification to ensure sealed records don't appear in background checks."
  },
  {
    icon: BadgeCheck,
    title: "Employment Support",
    description: "Resume review and employer letter templates explaining your fresh start."
  }
];

const eligibilityCriteria = [
 "Non-violent felonies (4th and 5th degree)",
  "Non-violent misdemeanors",
  "Cases with final discharge or completed probation",
  "No pending criminal charges",
  "Ohio residents or those with Ohio convictions",
  "Willing to commit to the full program process"
];

const timeline = [
  {
    phase: "Phase 1: Assessment",
    duration: "1-2 Weeks",
    description: "Comprehensive eligibility review, background check analysis, and custom strategy development."
  },
  {
    phase: "Phase 2: Document Preparation",
    duration: "2-3 Weeks",
    description: "Legal document drafting, attorney review, and court filing preparation."
  },
  {
    phase: "Phase 3: Filing & Hearing",
    duration: "30-60 Days",
    description: "Court filing, prosecutor coordination, and hearing representation (if required)."
  },
  {
    phase: "Phase 4: Verification",
    duration: "2-4 Weeks",
    description: "Order confirmation, record sealing verification, and employer notification support."
  }
];

const stats = [
  { value: "90-120", label: "Days Average" },
  { value: "88", label: "Counties Served" },
  { value: "0", label: "Records Sealed (Launch 2026)" },
  { value: "100", label: "% Mission-Driven" }
];

export default function ExpungementProgram() {
  return (
    <>
      <SEOHead
        title="Elite Ohio Expungement Program"
        description="Ohio's comprehensive expungement program. 90-120 day timeline, all 88 counties. Application-only access for serious candidates."
        path="/expungement-program"
      />

      <div className="min-h-screen bg-[#0a1628]">
        {/* Hero Section */}
        <section className="relative py-20 lg:py-28 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-[#1a3a5c]/30 to-transparent" />
          
          {/* Exclusive Badge */}
          <div className="absolute top-8 right-8">
            <div className="flex items-center gap-2 px-4 py-2 bg-[#bf8c4e]/20 border border-[#bf8c4e]/40 rounded-full">
              <Lock className="h-4 w-4 text-[#bf8c4e]" />
              <span className="text-[#bf8c4e] text-sm font-medium">Application Required</span>
            </div>
          </div>

          <div className="container-custom relative z-10">
            <div className="max-w-4xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#bf8c4e]/10 border border-[#bf8c4e]/30 rounded-full mb-8">
                <Star className="h-4 w-4 text-[#bf8c4e]" />
                <span className="text-[#bf8c4e] text-sm font-medium">Limited Enrollment Available</span>
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#f0e6d2] mb-6 font-display leading-tight">
                Ohio's Elite
                <span className="text-[#bf8c4e]"> Expungement Program</span>
              </h1>

              <p className="text-xl text-[#e8e4dc]/80 max-w-2xl mx-auto mb-8">
                A comprehensive, done-for-you expungement service serving all 88 Ohio counties. 
                Average completion: <strong className="text-[#bf8c4e]">120 days</strong>.
              </p>

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
                {stats.map((stat) => (
                  <div key={stat.label} className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <div className="text-3xl font-bold text-[#bf8c4e] mb-1">{stat.value}</div>
                    <div className="text-[#e8e4dc]/60 text-sm">{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  asChild
                  size="lg"
                  className="bg-[#bf8c4e] hover:bg-[#bf8c4e]/90 text-[#0a1628] px-8 py-6 text-base font-semibold"
                >
                  <Link to="/expungement-application">
                    Apply for Program Access
                    <Lock className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button 
                  asChild
                  variant="outline"
                  size="lg"
                  className="border-white/20 text-[#e8e4dc] hover:bg-white/5 px-8 py-6"
                >
                  <Link to="/blog/ohio-expungement-guide-2026">
                    Read Free Guide First
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>

              <p className="mt-6 text-sm text-[#e8e4dc]/50">
                Not everyone qualifies. Application required for program consideration.
              </p>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-20 border-t border-white/10">
          <div className="container-custom">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-[#f0e6d2] mb-4 font-display">
                The 4-Phase Process
              </h2>
              <p className="text-[#e8e4dc]/70 max-w-2xl mx-auto">
                Our proven system handles every aspect of your expungement from start to finish.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {timeline.map((phase, index) => (
                <div key={phase.phase} className="relative">
                  <div className="bg-white/5 rounded-xl p-6 border border-white/10 h-full">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-4xl font-bold text-[#bf8c4e]/30">0{index + 1}</span>
                      <div className="flex items-center gap-1 text-[#bf8c4e]">
                        <Calendar className="h-4 w-4" />
                        <span className="text-sm font-medium">{phase.duration}</span>
                      </div>
                    </div>
                    <h3 className="font-semibold text-[#f0e6d2] mb-2">{phase.phase}</h3>
                    <p className="text-[#e8e4dc]/60 text-sm">{phase.description}</p>
                  </div>
                  {index < timeline.length - 1 && (
                    <div className="hidden lg:block absolute top-1/2 -right-3 transform -translate-y-1/2 z-10">
                      <ArrowRight className="h-6 w-6 text-[#bf8c4e]/50" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Program Features */}
        <section className="py-20 bg-white/5">
          <div className="container-custom">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-[#f0e6d2] mb-6 font-display">
                  What's Included in the Program
                </h2>
                <p className="text-[#e8e4dc]/70 mb-8">
                  Unlike DIY expungement, our program provides comprehensive support 
                  through every step of the legal process.
                </p>

                <div className="space-y-4">
                  {programFeatures.map((feature) => (
                    <div key={feature.title} className="flex gap-4">
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[#bf8c4e]/20 flex items-center justify-center">
                        <feature.icon className="h-5 w-5 text-[#bf8c4e]" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-[#f0e6d2] mb-1">{feature.title}</h4>
                        <p className="text-[#e8e4dc]/60 text-sm">{feature.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gradient-to-br from-[#1a3a5c] to-[#0f172a] rounded-2xl p-8 border border-white/10">
                <div className="flex items-center gap-3 mb-6">
                  <Sparkles className="h-6 w-6 text-[#bf8c4e]" />
                  <h3 className="text-xl font-bold text-[#f0e6d2]">Program Investment</h3>
                </div>

                <div className="space-y-4 mb-8">
                  <div className="flex justify-between py-3 border-b border-white/10">
                    <span className="text-[#e8e4dc]/70">Standard Program</span>
                    <span className="text-[#f0e6d2] font-semibold">Sliding Scale</span>
                  </div>
                  <div className="flex justify-between py-3 border-b border-white/10">
                    <span className="text-[#e8e4dc]/70">Income Under $25k</span>
                    <span className="text-[#bf8c4e] font-semibold">Pro-Bono Available</span>
                  </div>
                  <div className="flex justify-between py-3 border-b border-white/10">
                    <span className="text-[#e8e4dc]/70">BCII Background Check</span>
                    <span className="text-[#f0e6d2]">Included</span>
                  </div>
                  <div className="flex justify-between py-3">
                    <span className="text-[#e8e4dc]/70">Attorney Representation</span>
                    <span className="text-[#f0e6d2]">Included</span>
                  </div>
                </div>

                <div className="bg-[#bf8c4e]/10 rounded-lg p-4 mb-6">
                  <p className="text-sm text-[#e8e4dc]/80">
                    <strong className="text-[#bf8c4e]">Note:</strong> Court filing fees ($50) and 
                    BCII fees ($22) are the only out-of-pocket costs for qualifying participants.
                  </p>
                </div>

                <Button 
                  asChild
                  className="w-full bg-[#bf8c4e] hover:bg-[#bf8c4e]/90 text-[#0a1628] py-6 font-semibold"
                >
                  <Link to="/expungement-application">
                    Start Application
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Eligibility */}
        <section className="py-20">
          <div className="container-custom">
            <div className="max-w-3xl mx-auto text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-[#f0e6d2] mb-4 font-display">
                Who Qualifies?
              </h2>
              <p className="text-[#e8e4dc]/70">
                Our program focuses on non-violent offenses where expungement has the highest success rate.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
              {eligibilityCriteria.map((criteria) => (
                <div key={criteria} className="flex items-center gap-3 bg-white/5 rounded-lg p-4 border border-white/10">
                  <CheckCircle className="h-5 w-5 text-[#bf8c4e] flex-shrink-0" />
                  <span className="text-[#e8e4dc] text-sm">{criteria}</span>
                </div>
              ))}
            </div>

            <div className="mt-12 text-center">
              <p className="text-[#e8e4dc]/60 mb-6">
                Not sure if you qualify? Our application includes a free eligibility assessment.
              </p>
              <Button 
                asChild
                variant="outline"
                className="border-[#bf8c4e] text-[#bf8c4e] hover:bg-[#bf8c4e]/10"
              >
                <Link to="/expungement-application">
                  Check Eligibility
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Comparison */}
        <section className="py-20 bg-white/5 border-y border-white/10">
          <div className="container-custom">
            <h2 className="text-3xl font-bold text-[#f0e6d2] mb-12 text-center font-display">
              Program vs. DIY Expungement
            </h2>

            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {/* DIY */}
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <h3 className="text-lg font-semibold text-[#e8e4dc] mb-4">DIY Expungement</h3>
                <ul className="space-y-3">
                  {[
                    "Self-guided process",
                    "Navigate courts alone",
                    "Generic forms",
                    "No follow-up support",
                    "No professional guidance (industry est. 40-50% success)",
                    "6-12 month timeline"
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-[#e8e4dc]/60 text-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#e8e4dc]/40" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Program */}
              <div className="bg-[#bf8c4e]/10 rounded-xl p-6 border border-[#bf8c4e]/30">
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="text-lg font-semibold text-[#f0e6d2]">Elite Program</h3>
                  <span className="px-2 py-0.5 bg-[#bf8c4e] text-[#0a1628] text-xs font-bold rounded">RECOMMENDED</span>
                </div>
                <ul className="space-y-3">
                  {[
                    "Dedicated case manager",
                    "Attorney representation",
                    "Custom legal documents",
                    "Post-expungement verification",
                    "Professional legal support",
                    "90-120 day timeline"
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-[#e8e4dc] text-sm">
                      <CheckCircle className="h-4 w-4 text-[#bf8c4e]" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-20">
          <div className="container-custom">
            <h2 className="text-3xl font-bold text-[#f0e6d2] mb-12 text-center font-display">
              What Applicants Are Saying
            </h2>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  quote: "I've been struggling to find work with my record for years. Having a program that handles everything from start to finish gives me real hope.",
                  author: "Applicant",
                  location: "Franklin County",
                  offense: "Awaiting Program Start"
                },
                {
                  quote: "The sliding scale pricing makes this accessible for people like me. I appreciate that they verify eligibility upfront.",
                  author: "Applicant",
                  location: "Cuyahoga County",
                  offense: "Application Submitted"
                },
                {
                  quote: "I've tried navigating the court system alone. Having professionals who know the process will make all the difference.",
                  author: "Applicant",
                  location: "Hamilton County",
                  offense: "Under Review"
                }
              ].map((testimonial, index) => (
                <div key={index} className="bg-white/5 rounded-xl p-6 border border-white/10">
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 text-[#bf8c4e] fill-[#bf8c4e]" />
                    ))}
                  </div>
                  <p className="text-[#e8e4dc]/80 text-sm mb-4 italic">"{testimonial.quote}"</p>
                  <div className="border-t border-white/10 pt-4">
                    <p className="font-medium text-[#f0e6d2]">{testimonial.author}</p>
                    <p className="text-xs text-[#e8e4dc]/50">{testimonial.location}</p>
                    <p className="text-xs text-[#bf8c4e]/70 mt-1">{testimonial.offense}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-20">
          <div className="container-custom">
            <div className="bg-gradient-to-r from-[#1a3a5c] to-[#0f172a] rounded-2xl p-8 md:p-12 text-center border border-white/10">
              <Lock className="h-12 w-12 text-[#bf8c4e] mx-auto mb-6" />
              <h2 className="text-3xl md:text-4xl font-bold text-[#f0e6d2] mb-4 font-display">
                Ready to Seal Your Record?
              </h2>
              <p className="text-[#e8e4dc]/80 max-w-2xl mx-auto mb-8">
                Our program has limited enrollment each quarter to ensure quality service. 
                Apply now to secure your spot in the next cohort.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  asChild
                  size="lg"
                  className="bg-[#bf8c4e] hover:bg-[#bf8c4e]/90 text-[#0a1628] px-8 py-6 text-base font-semibold"
                >
                  <Link to="/expungement-application">
                    Apply for Program Access
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>

              <p className="mt-6 text-sm text-[#e8e4dc]/50">
                Application review takes 3-5 business days. Not everyone is accepted.
              </p>
            </div>
          </div>
        </section>

        {/* Important Notice */}
        <section className="py-8 border-t border-white/10">
          <div className="container-custom max-w-3xl mx-auto text-center">
            <p className="text-xs text-[#e8e4dc]/40">
              <strong className="text-[#e8e4dc]/60">Legal Notice:</strong> This program provides 
              assistance with the expungement process but does not guarantee results. Final decisions 
              are made by Ohio courts. We are not a law firm, but we work with licensed Ohio attorneys 
              to provide legal services. The information provided is not legal advice.
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
