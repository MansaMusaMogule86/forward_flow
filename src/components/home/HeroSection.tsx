import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useAnalyticsContext } from "@/components/layout/AnalyticsProvider";

interface HeroSectionProps {
  selectedState: { name: string } | null;
  onShowStateModal: () => void;
  onShowAIDiscovery: () => void;
}

export const HeroSection = ({ selectedState, onShowStateModal, onShowAIDiscovery }: HeroSectionProps) => {
  const { trackClick } = useAnalyticsContext();
  return (
    <section className="relative bg-gradient-osu-primary text-white overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-osu-gray/90 via-osu-scarlet/80 to-osu-scarlet-dark/70"></div>
      <div className="absolute inset-0 -z-10 bg-[url('/images/diverse-families-community.jpg')] bg-cover bg-center opacity-20" />
      
      <div className="relative container py-24 md:py-32">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="font-heading text-4xl md:text-6xl font-bold mb-8 leading-tight">
            Forward Focus Elevation — Justice-Impacted Family Support
          </h1>
          
          <p className="text-lg md:text-xl text-white/90 mb-12 leading-relaxed max-w-2xl mx-auto">
            Empowering justice-impacted families with the tools to rebuild and thrive.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 max-w-2xl mx-auto mb-8 items-center justify-center">
            <Button
              size="lg"
              variant="outline"
              className="bg-osu-gray/20 border-osu-gray/30 text-white hover:bg-osu-gray/30"
              asChild
            >
              <Link
                to="/help"
                aria-label="Get immediate help and support services"
                onClick={() => trackClick('hero_get_help_now', { location: 'hero_section' })}
              >
                Get Help Now
              </Link>
            </Button>

            <Button 
              size="lg" 
              variant="outline" 
              className="bg-osu-gray/20 border-osu-gray/30 text-white hover:bg-osu-gray/30"
              onClick={() => {
                trackClick('hero_search_resources', { location: 'hero_section' });
                onShowAIDiscovery();
              }}
            >
              Search Resources
            </Button>

            <Button 
              size="lg" 
              variant="outline" 
              className="bg-osu-gray/20 border-osu-gray/30 text-white hover:bg-osu-gray/30"
              asChild
            >
              <Link 
                to="/help" 
                aria-label="Connect with Coach Kay"
                onClick={() => trackClick('hero_connect_coach_kay', { location: 'hero_section' })}
              >
                Connect with Coach Kay
              </Link>
            </Button>
          </div>

          <div className="text-sm text-white/80">
            AI-enhanced • Trauma-informed • Income-based support
          </div>
        </div>
      </div>
    </section>
  );
};