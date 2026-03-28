import { useState } from "react";
import { useStateContext } from "@/contexts/StateContext";
import AIResourceDiscovery from "@/components/ai/AIResourceDiscovery";
import StateModal from "@/components/ui/StateModal";
import { HeroSection } from "@/components/home/HeroSection";
import { TestimonialsSection } from "@/components/home/TestimonialsSection";
import { PathwaysSection } from "@/components/home/PathwaysSection";
import { CallToActionSection } from "@/components/home/CallToActionSection";
import { HomeFAQSection } from "@/components/home/HomeFAQSection";
import { SEOHead } from "@/components/seo/SEOHead";
import { StructuredData } from "@/components/seo/StructuredData";
import { ServiceStructuredData } from "@/components/seo/ServiceStructuredData";
import { SITE_CONFIG } from "@/config/site";


import { STATES } from "@/data/states";
import diverseCommunityMeeting from "@/assets/images/community/community-meeting.jpg";

const Index = () => {
  const [showAIDiscovery, setShowAIDiscovery] = useState(false);
  const [showStateModal, setShowStateModal] = useState(false);
  const { selectedState, setSelectedState } = useStateContext();

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": SITE_CONFIG.name,
    "url": SITE_CONFIG.baseUrl,
    "logo": `${SITE_CONFIG.baseUrl}${SITE_CONFIG.logo.default}`,
    "description": SITE_CONFIG.description,
    "sameAs": [],
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "Support",
      "areaServed": "US"
    }
  };

  const stateForAI = selectedState?.name ?? "Ohio";
  
  return (
    <>
      <SEOHead
        title="Home | Empowering Families"
        description={SITE_CONFIG.description}
        path="/"
      />
      <StructuredData data={structuredData} />
      <ServiceStructuredData />
      
      <main id="main" className="min-h-screen bg-background">
      <HeroSection 
        selectedState={selectedState}
        onShowStateModal={() => setShowStateModal(true)}
        onShowAIDiscovery={() => setShowAIDiscovery(true)}
      />
      
      
      <PathwaysSection />
      <TestimonialsSection />
      <CallToActionSection />
      <HomeFAQSection />
      
      {/* Community Image Section */}
      <section className="py-16 bg-gradient-to-b from-background to-muted/20">
        <div className="container px-4">
          <div className="relative rounded-2xl overflow-hidden shadow-xl max-w-5xl mx-auto">
            <img 
              src={diverseCommunityMeeting} 
              alt="Diverse community members meeting and supporting each other"
              className="w-full h-80 object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-primary/60 to-secondary/60 flex items-center justify-center">
              <div className="text-center text-primary-foreground max-w-3xl px-8">
                <h2 className="font-heading text-4xl md:text-5xl font-bold mb-4">Building Stronger Communities Together</h2>
                <p className="text-lg leading-relaxed">
                  Join our network of support, healing, and empowerment as we create pathways to brighter futures.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <AIResourceDiscovery 
        isOpen={showAIDiscovery} 
        onClose={() => setShowAIDiscovery(false)} 
        initialQuery="" 
        location={stateForAI} 
      />

      
      
      <StateModal 
        isOpen={showStateModal} 
        onClose={() => setShowStateModal(false)} 
        currentState={selectedState?.name ?? "Ohio"} 
        onStateChange={stateName => {
          const foundState = STATES.find(s => s.name === stateName);
          if (foundState) {
            setSelectedState(foundState);
          } else {
            setSelectedState({
              code: stateName.substring(0, 2).toUpperCase(),
              name: stateName,
              active: false,
              comingSoon: true
            });
          }
        }} 
      />
      </main>
    </>
  );
};
export default Index;