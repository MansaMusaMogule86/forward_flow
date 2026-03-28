import { Shield, Users, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";

export const SpecializedSupportSection = () => {
  return (
    <section className="scroll-mt-16">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-4">
            Find Specialized Support
          </h2>
          <p className="text-lg text-foreground/70">
            Looking for something specific? Jump directly to specialized support areas
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="pro-card p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="pro-icon-chip">
                <Shield className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-semibold">Healing Hub</h3>
                <p className="text-foreground/70">Trauma recovery and victim services</p>
              </div>
            </div>
            <Button asChild size="lg" className="w-full rounded-md border border-primary/30 bg-white/85 text-foreground hover:bg-white text-base font-semibold">
              <Link to="/victim-services">
                <Shield className="h-4 w-4 mr-2" />
                Access Healing Hub
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </Card>

          <Card className="pro-card p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="pro-icon-chip">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-semibold">The Collective</h3>
                <p className="text-foreground/70">Community support and growth programs</p>
              </div>
            </div>
            <Button asChild size="lg" className="w-full rounded-md border border-primary/30 bg-white/85 text-foreground hover:bg-white text-base font-semibold">
              <Link to="/learn">
                <Users className="h-4 w-4 mr-2" />
                Join Community
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </Card>
        </div>
      </div>
    </section>
  );
};