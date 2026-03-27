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
          <Card className="p-6 hover:shadow-lg transition-all">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-secondary rounded-xl flex items-center justify-center">
                <Shield className="h-6 w-6 text-secondary-foreground" />
              </div>
              <div>
                <h3 className="text-xl font-semibold">Healing Hub</h3>
                <p className="text-foreground/70">Trauma recovery and victim services</p>
              </div>
            </div>
            <Button asChild size="lg" variant="outline" className="w-full">
              <Link to="/victim-services">
                <Shield className="h-5 w-5 mr-2" />
                Access Healing Hub
                <ArrowRight className="h-5 w-5 ml-2" />
              </Link>
            </Button>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-all">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
                <Users className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h3 className="text-xl font-semibold">The Collective</h3>
                <p className="text-foreground/70">Community support and growth programs</p>
              </div>
            </div>
            <Button asChild size="lg" variant="outline" className="w-full">
              <Link to="/learn">
                <Users className="h-5 w-5 mr-2" />
                Join Community
                <ArrowRight className="h-5 w-5 ml-2" />
              </Link>
            </Button>
          </Card>
        </div>
      </div>
    </section>
  );
};