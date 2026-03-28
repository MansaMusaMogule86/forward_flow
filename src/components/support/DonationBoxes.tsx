import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Heart, DollarSign, Loader2 } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const donationOptions = [
  { name: "Give From the Heart", amount: "custom", description: "Choose your amount", featured: true, price_id: null },
  { name: "Legacy Builder", amount: 222, description: "Transform lives for generations", price_id: "price_1SAWuMPKfeSn0LlRgafJtdi1" },
  { name: "Impact Leader", amount: 111, description: "Drive meaningful change", price_id: "price_1SAXTgPKfeSn0LlRoFlDbpYw" },
  { name: "Knowledge Giver", amount: 88, description: "Fund education programs", price_id: "price_1SAXU7PKfeSn0LlRTpcRGhXW" },
  { name: "Freedom Mover", amount: 55, description: "Support reentry services", price_id: "price_1SAXUNPKfeSn0LlRLLRwS75I" },
  { name: "Safe Haven Sponsor", amount: 44, description: "Create safe spaces", price_id: "price_1SAXUgPKfeSn0LlRLamGcHBg" },
  { name: "Purpose Giver", amount: 33, description: "Give with intention", price_id: "price_1SAXUyPKfeSn0LlRj4z9l9J9" },
  { name: "Ground Builder", amount: 22, description: "Build strong foundations", price_id: "price_1SAXVBPKfeSn0LlRvvfIQl5I" },
  { name: "Change Starter", amount: 11, description: "Start positive change", price_id: "price_1SAXVNPKfeSn0LlRAF25adRh" }
];

export default function DonationBoxes() {
  const [loadingOption, setLoadingOption] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [lastAttemptedOption, setLastAttemptedOption] = useState<typeof donationOptions[0] | null>(null);
  const { toast } = useToast();

  const [customAmount, setCustomAmount] = useState("");

  const handleDonationClick = async (option: typeof donationOptions[0]) => {
    setLastAttemptedOption(option);

    let finalAmount = option.amount;
    if (option.amount === "custom") {
      if (!customAmount || isNaN(Number(customAmount)) || Number(customAmount) <= 0) {
        toast({
          title: "Invalid Amount",
          description: "Please enter a valid donation amount.",
          variant: "destructive",
        });
        return;
      }
      finalAmount = Number(customAmount);
    }

    if (!option.price_id && option.amount !== "custom") {
      toast({
        title: "Error",
        description: "Payment option is not configured properly.",
        variant: "destructive",
      });
      return;
    }

    setLoadingOption(option.name);
    setPaymentError(null); // Clear any previous errors
    
    try {
      const { data, error } = await supabase.functions.invoke('create-donation-payment', {
        body: {
          price_id: option.price_id,
          amount: finalAmount,
          donor_name: "Anonymous"
        }
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank', 'noopener,noreferrer');
      } else {
        throw new Error("No payment URL received");
      }
    } catch (error) {
      console.error("Payment error:", error);
      setPaymentError('Payment creation failed. Please try again.');
      toast({
        title: "Payment Error",
        description: "Unable to process payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingOption(null);
    }
  };

  const featuredOption = donationOptions[0];

  return (
    <div className="space-y-6">
      {/* Error Alert with Retry */}
      {paymentError && (
        <Alert variant="destructive">
          <AlertDescription className="flex justify-between items-center">
            <span>{paymentError}</span>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => {
                setPaymentError(null);
                if (lastAttemptedOption) handleDonationClick(lastAttemptedOption);
              }}
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Featured Option */}
      <Card className="border-2 border-osu-scarlet bg-gradient-to-br from-osu-scarlet/5 to-osu-scarlet/10 hover:shadow-lg transition-all duration-300">
        <CardContent className="p-6 text-center">
          <div className="w-12 h-12 bg-osu-scarlet rounded-full flex items-center justify-center mx-auto mb-4">
            <Heart className="h-6 w-6 text-osu-scarlet-foreground" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">{featuredOption.name}</h3>
          <p className="text-foreground/70 mb-6">{featuredOption.description}</p>

          <div className="flex gap-2 max-w-xs mx-auto mb-4">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <input
                type="number"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                placeholder="0.00"
                className="w-full pl-7 pr-3 py-2 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <Button
              onClick={() => handleDonationClick(featuredOption)}
              className="bg-osu-scarlet hover:bg-osu-scarlet-dark text-osu-scarlet-foreground"
              disabled={loadingOption === featuredOption.name}
            >
              {loadingOption === featuredOption.name ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Donate"
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Every contribution helps keep our services free for the community.</p>
        </CardContent>
      </Card>

      {/* Fixed Amount Options */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {donationOptions.slice(1).map((option) => (
          <Card 
            key={option.name} 
            className={`border border-border hover:border-osu-scarlet/50 hover:shadow-md transition-all duration-300 cursor-pointer group ${
              loadingOption === option.name ? 'opacity-50 pointer-events-none' : ''
            }`}
            onClick={() => handleDonationClick(option)}
          >
            <CardContent className="p-4 text-center">
              <div className="w-8 h-8 bg-osu-scarlet/10 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-osu-scarlet/20 transition-colors">
                {loadingOption === option.name ? (
                  <Loader2 className="h-4 w-4 text-osu-scarlet animate-spin" />
                ) : (
                  <DollarSign className="h-4 w-4 text-osu-scarlet" />
                )}
              </div>
              <div className="text-2xl font-bold text-osu-scarlet mb-1">${option.amount}</div>
              <div className="text-sm font-medium text-foreground mb-2">{option.name}</div>
              <div className="text-xs text-foreground/60">{option.description}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}