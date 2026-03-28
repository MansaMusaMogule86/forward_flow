import { AlertTriangle } from "lucide-react";

export const HelpHeroSection = () => {
  return (
    <header className="relative bg-gradient-osu-primary overflow-hidden border-b border-primary/20">
      <div className="absolute inset-0 bg-gradient-to-br from-white/72 via-cream/62 to-secondary/28"></div>
      <div className="relative container py-16 md:py-24">
        <div className="max-w-5xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center mb-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-secondary/35 bg-white/70 px-4 py-2 backdrop-blur-sm">
              <div className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-secondary/15 border border-secondary/30">
                <AlertTriangle className="h-4 w-4 text-secondary" />
              </div>
              <span className="font-mono text-[11px] uppercase tracking-[0.14em] font-medium text-secondary/90">
                Crisis Support Available 24/7
              </span>
            </div>
          </div>
          
          <h1 className="font-heading text-4xl md:text-6xl font-bold mb-6 leading-tight text-foreground">
            Need Help Right Now?
          </h1>
          
          <p className="text-lg md:text-xl text-foreground/80 mb-8 leading-relaxed max-w-2xl mx-auto">
            You're not alone. Get immediate crisis support, emergency resources, or personalized guidance to find the help you need.
          </p>
        </div>
      </div>
    </header>
  );
};