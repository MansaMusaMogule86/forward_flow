import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Mail, Sparkles } from "lucide-react";

export const NewsletterPopup = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const hasSeenPopup = localStorage.getItem("ffe-newsletter-popup-seen");
    if (!hasSeenPopup) {
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 30000); // Show after 30 seconds to reduce CLS
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem("ffe-newsletter-popup-seen", "true");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    try {
      // First try inserting into newsletter_subscriptions
      const { error } = await supabase
        .from("newsletter_subscriptions")
        .insert([{ email }]);

      if (error) {
        if (error.code === "23505") {
          toast({
            title: "Already subscribed",
            description: "This email is already on our list.",
          });
          handleClose();
          return;
        } else {
          throw error;
        }
      }

      toast({
        title: "Success!",
        description: "You've been subscribed to our newsletter.",
      });
      handleClose();
    } catch (error) {
      console.error("Newsletter subscription error:", error);
      toast({
        title: "Error",
        description: "Failed to subscribe. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md bg-gradient-to-br from-cream to-white border-osu-scarlet/20">
        <DialogHeader>
          <div className="mx-auto w-12 h-12 bg-osu-scarlet/10 rounded-full flex items-center justify-center mb-4">
            <Mail className="h-6 w-6 text-osu-scarlet" />
          </div>
          <DialogTitle className="text-center text-2xl font-heading font-bold text-foreground">
            Join The Collective
          </DialogTitle>
          <DialogDescription className="text-center text-muted-foreground pt-2">
            Subscribe to our newsletter for the latest AI transformation tips, community updates, and success stories.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <Input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="border-osu-gray/20 focus:border-osu-scarlet"
          />
          <Button
            type="submit"
            className="w-full get-involved-gold-button border-none py-6 text-lg"
            disabled={isLoading}
          >
            {isLoading ? "Subscribing..." : "Keep Me Updated"}
            <Sparkles className="ml-2 h-4 w-4" />
          </Button>
        </form>
        <p className="text-xs text-center text-muted-foreground">
          By subscribing, you agree to our{" "}
          <a href="/privacy" className="underline hover:text-osu-scarlet transition-colors">
            Privacy Policy
          </a>.
        </p>
        <DialogFooter className="sm:justify-center">
          <button
            onClick={handleClose}
            className="text-xs text-muted-foreground hover:text-osu-scarlet transition-colors"
          >
            Maybe later
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
