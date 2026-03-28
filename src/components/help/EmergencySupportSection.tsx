import { Phone, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const EmergencySupportSection = () => {
  return (
    <section className="scroll-mt-16">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-4">
            Emergency Crisis Support
          </h2>
          <p className="text-lg text-foreground/70 max-w-2xl mx-auto">
            If you're in immediate danger or having thoughts of self-harm
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="pro-card border-l-4 border-l-destructive">
            <CardHeader className="text-center">
              <div className="pro-icon-chip mx-auto mb-4">
                <Phone className="h-6 w-6 text-destructive-foreground" />
              </div>
              <CardTitle className="text-xl">Life-Threatening Emergency</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-foreground/70 mb-6">For immediate life-threatening emergencies</p>
              <Button 
                size="lg" 
                className="w-full rounded-md border border-secondary/45 bg-secondary text-secondary-foreground hover:bg-secondary/90 text-base font-semibold"
                onClick={() => window.location.href = 'tel:911'}
              >
                <Phone className="h-4 w-4 mr-2" />
                Call 911 Now
              </Button>
            </CardContent>
          </Card>

          <Card className="pro-card border-l-4 border-l-primary">
            <CardHeader className="text-center">
              <div className="pro-icon-chip mx-auto mb-4">
                <MessageCircle className="h-6 w-6" />
              </div>
              <CardTitle className="text-xl">Crisis & Suicide Prevention</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-foreground/70 mb-6">24/7 mental health crisis support</p>
              <Button 
                size="lg" 
                className="w-full rounded-md border border-primary/40 bg-primary text-primary-foreground hover:bg-primary/90 text-base font-semibold"
                onClick={() => window.location.href = 'tel:988'}
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Call or Text 988
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};