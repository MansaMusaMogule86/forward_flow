import { Users, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export const PathwaysSection = () => {
  return (
    <section className="py-8 sm:py-12 md:py-16 bg-gradient-to-b from-osu-gray/5 to-background">
      <div className="container px-4 sm:px-6">
        <div className="text-center mb-8 sm:mb-10">
          <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4 text-foreground">
            Choose Your Path Forward
          </h2>
        </div>

        <div className="grid gap-4 sm:gap-6 md:grid-cols-2 max-w-5xl mx-auto">
          <Card className="border-2 border-osu-scarlet/20 bg-card/90 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 hover:border-osu-scarlet/40 group">
            <CardHeader className="pb-3 sm:pb-4">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="p-2 sm:p-3 bg-gradient-to-br from-osu-scarlet to-osu-scarlet-dark rounded-lg group-hover:shadow-lg transition-shadow duration-300 flex-shrink-0">
                  <Users className="h-5 w-5 sm:h-6 sm:w-6 text-white" aria-hidden />
                </div>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg sm:text-xl font-bold mb-1 sm:mb-2 text-foreground">
                    Justice-Impacted Families
                  </CardTitle>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    Free learning community, peer support, and life coaching.
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-6 leading-relaxed">
                Free learning community, peer support, and income-based life coaching designed
                specifically for justice-impacted individuals and families.
              </p>
              <Button 
                asChild 
                size="lg" 
                className="w-full get-involved-gold-button border-none h-11 sm:h-12 text-sm sm:text-base"
                aria-label="Access The Collective"
              >
                <Link to="/learn">The Collective Hub →</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-2 border-osu-scarlet/20 bg-card/90 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 hover:border-osu-scarlet/40 group">
            <CardHeader className="pb-3 sm:pb-4">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="p-2 sm:p-3 bg-gradient-to-br from-osu-scarlet to-osu-scarlet-dark rounded-lg group-hover:shadow-lg transition-shadow duration-300 flex-shrink-0">
                  <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-white" aria-hidden />
                </div>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg sm:text-xl font-bold mb-1 sm:mb-2 text-foreground">
                    Crime Victims &amp; Survivors
                  </CardTitle>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    Specialized trauma-informed support and crisis tools.
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-6 leading-relaxed">
                Comprehensive healing &amp; safety hub with crisis support, compensation guidance,
                and specialized trauma-informed coaching.
              </p>
              <Button 
                asChild 
                size="lg" 
                className="w-full get-involved-gold-button border-none h-11 sm:h-12 text-sm sm:text-base"
                aria-label="Access Healing Hub"
              >
                <Link to="/victim-services">Healing Hub →</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};