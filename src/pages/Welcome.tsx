import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";
import { 
  ArrowRight, 
  Heart, 
  Users, 
  Building2, 
  Shield, 
  CheckCircle,
  Sparkles,
  Home,
  Briefcase,
  HandHeart
} from "lucide-react";

// Import existing images
import diverseFamilies from "@/assets/images/community/families-healing.jpg";
import communitySupport from "@/assets/images/community/community-support.jpg";
import learningEnvironment from "@/assets/images/community/learning-environment.jpg";

const Welcome = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const referralSource = searchParams.get("ref");
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  useEffect(() => {
    document.title = "Welcome to Forward Focus Elevation | Start Your Journey";
    
    // Track affiliate referral
    if (referralSource) {
      // Could track this in analytics
    }
  }, [referralSource]);

  // Testimonial carousel auto-rotate
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const testimonials = [
    {
      quote: "Forward Focus helped me rebuild my life after incarceration. The resources and support changed everything.",
      author: "Michael R.",
      role: "Program Graduate"
    },
    {
      quote: "As a mother, I was lost. This community gave me hope and practical tools to support my son's reentry.",
      author: "Sarah J.",
      role: "Family Member"
    },
    {
      quote: "Partnering with Forward Focus has amplified our organization's impact in the justice-impacted community.",
      author: "Jessica T.",
      role: "Partner Organization"
    }
  ];

  const pathways = [
    {
      icon: Home,
      title: "Seeking Healing",
      description: "Find resources, support, and guidance in our Healing Hub",
      action: "Explore Healing Hub",
      link: "/help",
      color: "from-osu-scarlet to-osu-scarlet-dark"
    },
    {
      icon: HandHeart,
      title: "Offering Support",
      description: "Volunteer, donate, or share your expertise with our community",
      action: "Get Involved",
      link: "/support",
      color: "from-osu-gray to-osu-gray-dark"
    },
    {
      icon: Briefcase,
      title: "Partner with Us",
      description: "Join our network of verified community partners",
      action: "Become a Partner",
      link: "/partner-signup",
      color: "from-osu-scarlet-light to-osu-scarlet"
    }
  ];

  const stats = [
    { value: 50, suffix: " States", label: "Nationwide Network" },
    { value: 24, suffix: "/7", label: "Crisis Support Available" },
    { value: 100, suffix: "%", label: "Free Resources" },
    { value: 0, suffix: "", label: "No Hidden Fees" }
  ];

  return (
    <main id="main" className="min-h-screen">
      {/* Hero Section with Animated Background */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-osu-scarlet via-osu-gray to-osu-scarlet">
        {/* Animated Background Overlay */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-white rounded-full blur-3xl animate-pulse delay-1000" />
        </div>

        <div className="container relative z-10 px-4 py-20">
          <div className="max-w-4xl mx-auto text-center space-y-8 animate-fade-in">
            {/* Referral Badge */}
            {referralSource && (
              <Badge className="bg-white/20 text-white border-white/40 backdrop-blur-sm text-sm px-4 py-2">
                <Sparkles className="h-4 w-4 mr-2" />
                Welcome from {referralSource}
              </Badge>
            )}

            {/* Main Headline - Animated */}
            <h1 className="font-heading text-5xl md:text-7xl font-bold text-white leading-tight">
              Your Story Matters.
              <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
                Let's Write the Next Chapter Together.
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-xl md:text-2xl text-white/90 max-w-2xl mx-auto">
              Join families nationwide rebuilding their lives with free resources, personalized support, and a community that understands.
            </p>

            {/* Choose Your Path - Interactive Buttons */}
            <div className="grid md:grid-cols-3 gap-6 pt-8">
              {pathways.map((pathway, index) => (
                <Card 
                  key={index}
                  className="group hover:scale-105 transition-all duration-300 cursor-pointer bg-white/10 backdrop-blur-md border-white/20 hover:bg-white/20"
                  onClick={() => navigate(pathway.link)}
                >
                  <CardContent className="p-6 text-center space-y-4">
                    <div className={`mx-auto w-16 h-16 rounded-full bg-gradient-to-br ${pathway.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                      <pathway.icon className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="font-heading text-xl font-bold text-white">{pathway.title}</h3>
                    <p className="text-white/80 text-sm">{pathway.description}</p>
                    <Button 
                      variant="ghost" 
                      className="text-white hover:bg-white/20 w-full group-hover:bg-white/30"
                    >
                      {pathway.action}
                      <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Trust Signals */}
            <div className="pt-8 flex items-center justify-center gap-6 text-white/70 text-sm flex-wrap">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                <span>100% Free Resources</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                <span>Secure & Confidential</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                <span>Nationwide Network</span>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-white/40 rounded-full flex items-start justify-center p-2">
            <div className="w-1 h-3 bg-white/60 rounded-full" />
          </div>
        </div>
      </section>

      {/* Impact Statistics Section */}
      <section className="py-20 bg-gradient-to-b from-background to-secondary/10">
        <div className="container px-4">
          <div className="text-center mb-12">
            <h2 className="font-heading text-4xl md:text-5xl font-bold text-foreground mb-4">
              Making Real Impact, Together
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Every day, we're helping justice-impacted individuals and families build brighter futures
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-5xl mx-auto">
            {stats.map((stat, index) => (
              <Card key={index} className="text-center hover:shadow-lg transition-shadow border-primary/20">
                <CardContent className="pt-8 pb-6">
                  <div className="text-4xl md:text-5xl font-bold text-primary mb-2">
                    <AnimatedCounter 
                      end={stat.value} 
                      suffix={stat.suffix}
                      duration={2500}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground font-medium">{stat.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Visual Storytelling Section */}
      <section className="py-20 bg-gradient-to-b from-secondary/10 to-background">
        <div className="container px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
            <div className="space-y-6 order-2 md:order-1">
              <Badge className="bg-primary/10 text-primary">Our Approach</Badge>
              <h2 className="font-heading text-4xl md:text-5xl font-bold text-foreground">
                You're Not Alone on This Journey
              </h2>
              <p className="text-lg text-muted-foreground">
                We connect justice-impacted individuals and families with comprehensive resources, 
                trusted partners, and a supportive community that understands your unique challenges.
              </p>
              <ul className="space-y-3">
                {[
                  "Personalized resource matching based on your location and needs",
                  "24/7 access to crisis support and emergency services",
                  "Peer support from others who've walked this path",
                  "Educational programs to build skills and confidence"
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle className="h-6 w-6 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
              <Button 
                size="lg" 
                onClick={() => navigate("/help")}
                className="get-involved-gold-button border-none font-bold shadow-xl"
              >
                Start Your Journey Today
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>

            <div className="order-1 md:order-2 relative">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                <img 
                  src={diverseFamilies} 
                  alt="Diverse families finding hope and healing together"
                  className="w-full h-auto"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              </div>
              {/* Floating Stats */}
              <Card className="absolute -bottom-6 -left-6 bg-white/95 backdrop-blur-sm shadow-xl border-primary/20">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Heart className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-primary">98%</div>
                    <div className="text-xs text-muted-foreground">Feel Supported</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Success Stories Carousel */}
      <section className="py-20 bg-gradient-to-b from-background to-primary/5">
        <div className="container px-4">
          <div className="text-center mb-12">
            <Badge className="bg-primary/10 text-primary mb-4">Real Stories</Badge>
            <h2 className="font-heading text-4xl md:text-5xl font-bold text-foreground mb-4">
              Voices of Hope & Transformation
            </h2>
          </div>

          <div className="max-w-4xl mx-auto">
            <Card className="bg-gradient-to-br from-white to-primary/5 border-primary/20 shadow-xl">
              <CardContent className="p-12 text-center space-y-6">
                <div className="text-6xl text-primary/20">"</div>
                <blockquote className="text-2xl md:text-3xl font-medium text-foreground leading-relaxed">
                  {testimonials[activeTestimonial].quote}
                </blockquote>
                <div className="pt-4">
                  <div className="font-semibold text-foreground">
                    {testimonials[activeTestimonial].author}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {testimonials[activeTestimonial].role}
                  </div>
                </div>

                {/* Carousel Dots */}
                <div className="flex justify-center gap-2 pt-4">
                  {testimonials.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setActiveTestimonial(index)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        index === activeTestimonial 
                          ? "bg-primary w-8" 
                          : "bg-primary/30 hover:bg-primary/50"
                      }`}
                      aria-label={`Go to testimonial ${index + 1}`}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Community Support Section */}
      <section className="py-20 bg-gradient-to-b from-background to-primary/5">
        <div className="container px-4">
          <div className="max-w-3xl mx-auto">
            <Card className="bg-gradient-to-br from-osu-scarlet/10 via-osu-gray/5 to-osu-scarlet/5 border-osu-scarlet/20 shadow-xl">
              <CardContent className="p-8 md:p-12 space-y-6 text-center">
                <div className="inline-block p-4 bg-gradient-to-br from-osu-scarlet to-osu-scarlet-dark rounded-full shadow-lg">
                  <Sparkles className="h-12 w-12 text-white" />
                </div>
                <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground">
                  Stay Connected with Our Community
                </h2>
                <p className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
                  Access curated resources, success stories, and support networks—all tailored to justice-impacted families.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                  <Button 
                    size="lg"
                    className="get-involved-gold-button border-none font-bold shadow-xl"
                    onClick={() => navigate("/help")}
                  >
                    <Heart className="mr-2 h-5 w-5" />
                    Get Resources
                  </Button>
                  <Button 
                    size="lg"
                    variant="outline"
                    className="border-osu-scarlet text-osu-scarlet hover:bg-osu-scarlet/10"
                    onClick={() => navigate("/support")}
                  >
                    <Users className="mr-2 h-5 w-5" />
                    Support Our Mission
                  </Button>
                </div>

                <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground pt-4 flex-wrap">
                  <span className="flex items-center gap-1">
                    <CheckCircle className="h-4 w-4 text-osu-scarlet" />
                    Free resources
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle className="h-4 w-4 text-osu-scarlet" />
                    24/7 support
                  </span>
                  <span className="flex items-center gap-1">
                    <Shield className="h-4 w-4 text-osu-scarlet" />
                    Privacy protected
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Trust Signals / As Seen In */}
      <section className="py-12 bg-muted/30">
        <div className="container px-4">
          <p className="text-center text-sm text-muted-foreground mb-8 font-medium">
            TRUSTED BY ORGANIZATIONS NATIONWIDE
          </p>
          <div className="flex items-center justify-center gap-12 flex-wrap opacity-60">
            {/* Placeholder for partner logos - replace with actual logos */}
            <div className="flex items-center gap-2">
              <Building2 className="h-8 w-8" />
              <span className="font-semibold">Community Partners</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-8 w-8" />
              <span className="font-semibold">Verified Network</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-8 w-8" />
              <span className="font-semibold">Nationwide Reach</span>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 bg-gradient-to-br from-osu-scarlet to-osu-gray text-white">
        <div className="container px-4 text-center">
          <div className="max-w-3xl mx-auto space-y-8">
            <h2 className="font-heading text-4xl md:text-5xl font-bold">
              Ready to Start Your Journey?
            </h2>
            <p className="text-xl text-white/90">
              Your path to a brighter future begins with a single step. 
              Free resources, personalized support, and a caring community await.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button 
                size="lg" 
                onClick={() => navigate("/help")}
                className="get-involved-gold-button border-none font-bold h-14 px-12 text-lg shadow-2xl"
              >
                Explore Healing Hub
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                onClick={() => navigate("/partner-signup")}
                className="border-white text-white hover:bg-white/10 font-semibold h-14 px-8 text-lg"
              >
                Become a Partner
              </Button>
            </div>
            <p className="text-sm text-white/70 pt-4">
              Available 24/7 • Completely Free • Confidential & Secure
            </p>
          </div>
        </div>
      </section>
    </main>
  );
};

export default Welcome;
