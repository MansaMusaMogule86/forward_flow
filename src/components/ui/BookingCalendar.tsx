import { Button } from "@/components/ui/button";
import { Calendar, ExternalLink } from "lucide-react";
import { useCalendlyPopup } from "@/hooks/useCalendlyPopup";

const BookingCalendar = () => {
  const { openCalendly, calendlyReady } = useCalendlyPopup();

  const handleBooking = () => {
    openCalendly('https://calendly.com/ffe_coach_kay/free-call');
  };

  return (
    <Button
      size="lg"
      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
      onClick={handleBooking}
      disabled={!calendlyReady}
    >
      <Calendar className="h-5 w-5 mr-2" />
      {calendlyReady ? 'Book a Free Consultation' : 'Loading Calendar...'}
      <ExternalLink className="h-4 w-4 ml-2" />
    </Button>
  );
};

export default BookingCalendar;
