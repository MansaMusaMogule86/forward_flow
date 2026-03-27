import { useState } from "react";
import { AiErrorBoundary } from "@/components/ui/AiErrorBoundary";
import CrisisSupportAI from "@/components/ai/CrisisSupportAI";
import AIResourceDiscovery from "@/components/ai/AIResourceDiscovery";
import { AIResourceRecommendations } from "@/components/ai/AIResourceRecommendations";
import { HelpHeroSection } from "@/components/help/HelpHeroSection";
import { EmergencySupportSection } from "@/components/help/EmergencySupportSection";
import { AIPoweredHelpSection } from "@/components/help/AIPoweredHelpSection";
import { SpecializedSupportSection } from "@/components/help/SpecializedSupportSection";
import { SEOHead } from "@/components/seo/SEOHead";
import { StructuredData } from "@/components/seo/StructuredData";
import { BreadcrumbSchema } from "@/components/seo/BreadcrumbSchema";

export default function GetHelpNow() {
  const [showCrisisAI, setShowCrisisAI] = useState(false);
  const [showAIDiscovery, setShowAIDiscovery] = useState(false);

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "Get Help Now - Immediate Crisis Support",
    "description": "Immediate crisis support and emergency resources with 24/7 crisis lines and AI-powered guidance",
    "url": "https://forward-focus-elevation.org/help",
    "provider": {
      "@type": "Organization",
      "name": "Forward Focus Elevation"
    },
    "offers": {
      "@type": "Offer",
      "availability": "https://schema.org/InStock",
      "price": "0",
      "priceCurrency": "USD"
    }
  };

  return (
    <>
      <SEOHead
        title="Get Help Now - Immediate Crisis Support"
        description="Immediate crisis support and emergency resources. Get help now with 24/7 crisis lines, AI-powered guidance, and direct connections to emergency services."
        path="/help"
      />
      <StructuredData data={structuredData} />
      <BreadcrumbSchema crumbs={[{ name: 'Get Help Now', path: '/help' }]} />
      
      <main id="main" className="min-h-screen">
        <HelpHeroSection />
        
        <div className="container py-16 space-y-16">
          <EmergencySupportSection />
          <AIResourceRecommendations />
          <AIPoweredHelpSection 
            onShowCrisisAI={() => setShowCrisisAI(true)}
            onShowAIDiscovery={() => setShowAIDiscovery(true)}
          />
          <SpecializedSupportSection />
        </div>
      </main>

      {/* Modals */}
      <AiErrorBoundary>
        <CrisisSupportAI 
          isOpen={showCrisisAI} 
          onClose={() => setShowCrisisAI(false)} 
        />
      </AiErrorBoundary>
      <AiErrorBoundary>
        <AIResourceDiscovery 
          isOpen={showAIDiscovery} 
          onClose={() => setShowAIDiscovery(false)} 
          initialQuery=""
          location="Ohio"
        />
      </AiErrorBoundary>
    </>
  );
}