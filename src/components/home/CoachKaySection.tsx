import { Calendar, Award } from "lucide-react";
import coachKay from "@/assets/images/about/coach-kay.png";
import { Button } from "@/components/ui/button";
import AskCoachKay from "@/components/ui/AskCoachKay";
import { useCalendlyPopup } from "@/hooks/useCalendlyPopup";

export const CoachKaySection = () => {
  const { openCalendly, calendlyReady } = useCalendlyPopup();
  
  return (
    <section className="py-24 bg-gradient-to-br from-secondary/10 to-accent/10">
      <div className="container">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-osu-scarlet/10 text-osu-scarlet px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest mb-6">
                <Award className="h-4 w-4" />
                Master Certified Transformation Coach
              </div>
              <h2 className="font-heading text-4xl md:text-5xl font-bold text-foreground mb-4">
                Meet Coach Kay
              </h2>
              <h3 className="text-xl font-semibold text-osu-scarlet mb-8">
                AI Life Transformation Coach & Consultant
              </h3>
              <div className="space-y-6 text-foreground">
                <p className="text-xl leading-relaxed">
                  Behind Forward Focus Elevation is Coach Kay, an accredited expert in bridging the gap between human potential and artificial intelligence.
                </p>
                <p className="text-lg leading-relaxed">
                  As a Master Certified coach in Transformation, Mindfulness, and Life Purpose, she combines clinical-adjacent wisdom with her background as an Accredited AI Prompt Engineer to build the world's first true "Hub for Second Chances."
                </p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8 max-w-md">
                <AskCoachKay />
                <Button 
                  type="button"
                  size="lg" 
                  variant="outline" 
                  disabled={!calendlyReady}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (calendlyReady && window.Calendly) {
                      window.Calendly.initPopupWidget({ url: 'https://calendly.com/ffe_coach_kay' });
                    }
                  }}
                  className="w-full"
                >
                  <Calendar className="h-5 w-5 mr-2" />
                  {calendlyReady ? 'Book Consultation' : 'Loading...'}
                </Button>
              </div>
            </div>
            
            <div className="relative">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                <img 
                  src={coachKay}
                  alt="Coach Kay, founder of Forward Focus Elevation, sitting professionally in a modern office setting" 
                  className="w-full h-96 lg:h-[500px] object-contain" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/80 to-transparent flex items-end">
                  <div className="p-8 text-white">
                    <p className="text-xl font-semibold mb-2">
                      "We hustle different. With clarity. With care. With cause."
                    </p>
                    <p className="text-white/90">— Coach Kay, Founder</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};