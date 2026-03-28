import { Phone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

const DISMISS_KEY = "emergency-bar-dismissed";
const DISMISS_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days in ms

const EmergencyBar = () => {
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem(DISMISS_KEY);
      if (dismissed) {
        const dismissedTime = parseInt(dismissed, 10);
        const now = Date.now();
        if (now - dismissedTime < DISMISS_DURATION) {
          setIsDismissed(true);
        } else {
          localStorage.removeItem(DISMISS_KEY);
        }
      }
    } catch (_e) { /* localStorage unavailable */ }
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, Date.now().toString());
    } catch (_e) { /* localStorage unavailable */ }
  };

  if (isDismissed) return null;

  return (
    <div className="sticky top-0 z-[70] w-full bg-osu-scarlet-light/10 border-b border-osu-scarlet/20 text-osu-scarlet-dark h-10">
    <div className="container flex items-center justify-center h-full px-6 text-xs relative">
        <p className="font-medium">
          Need help now? Call{' '}
          <a href="tel:211" className="underline hover:text-primary/80 font-semibold">
            211
          </a>{' '}
          for local services or dial{' '}
          <a href="tel:988" className="underline hover:text-primary/80 font-semibold">
            988
          </a>{' '}
          for the Suicide & Crisis Lifeline.
        </p>
        <div className="flex items-center gap-2 absolute right-6">
          <div className="hidden sm:flex gap-2">
            <Button asChild size="sm" variant="outline" className="bg-transparent border-osu-scarlet text-osu-scarlet hover:bg-osu-scarlet hover:text-white h-7 px-3 text-xs">
              <a href="tel:211" aria-label="Call 211 now">Call 211</a>
            </Button>
            <Button asChild size="sm" variant="outline" className="bg-transparent border-osu-scarlet text-osu-scarlet hover:bg-osu-scarlet hover:text-white h-7 px-3 text-xs">
              <a href="https://www.211.org/" target="_blank" rel="noreferrer">Find Services</a>
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="h-7 w-7 p-0 text-osu-scarlet hover:bg-osu-scarlet/10"
            aria-label="Dismiss emergency bar"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
      {/* Mobile FAB */}
      <div className="sm:hidden">
        <a
          href="tel:211"
          aria-label="Call 211 now"
          className="fixed bottom-4 right-4 inline-flex items-center gap-2 rounded-full bg-osu-scarlet hover:bg-osu-scarlet-dark text-white shadow-lg px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-osu-scarlet/20 z-50"
        >
          <Phone className="h-4 w-4" />
          <span>Call 211</span>
        </a>
      </div>
    </div>
  );
};

export default EmergencyBar;
