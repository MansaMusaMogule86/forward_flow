import { Heart } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import testimonialSarah from "@/assets/images/testimonials/sarah.jpg";
import testimonialMichael from "@/assets/images/testimonials/michael.jpg";
import testimonialJessica from "@/assets/images/testimonials/jessica.jpg";

interface Testimonial {
  quote: string;
  name: string;
  location: string;
  avatar: string;
  stars: number;
}

const fallbackTestimonials: Testimonial[] = [
  {
    quote: "The trauma-informed approach made all the difference in my healing journey.",
    name: "Sarah M.",
    location: "Atlanta, GA",
    avatar: testimonialSarah,
    stars: 5
  },
  {
    quote: "Finally found a community that truly understands my family's experience.",
    name: "Carlos R.",
    location: "Phoenix, AZ", 
    avatar: testimonialMichael,
    stars: 5
  },
  {
    quote: "The personalized resources helped us navigate reentry with confidence.",
    name: "Jessica L.",
    location: "Detroit, MI",
    avatar: testimonialJessica,
    stars: 5
  }
];

export const TestimonialsSection = () => {
  const { data: dbTestimonials, isLoading } = useQuery({
    queryKey: ['featured-testimonials'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('success_stories')
        .select('id, title, participant_testimonial, participant_name, images')
        .eq('published', true)
        .eq('featured', true)
        .limit(3);
      
      if (error) {
        console.error('Error fetching testimonials:', error);
        return null;
      }
      return data;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Map database stories to testimonial format or use fallbacks
  const testimonials: Testimonial[] = dbTestimonials && dbTestimonials.length > 0
    ? dbTestimonials.map((story, index) => ({
        quote: story.participant_testimonial 
          ? (story.participant_testimonial.slice(0, 100) + (story.participant_testimonial.length > 100 ? '...' : ''))
          : story.title,
        name: story.participant_name || 'Community Member',
        location: 'United States',
        avatar: (story.images && Array.isArray(story.images) && story.images.length > 0) 
          ? String(story.images[0]) 
          : fallbackTestimonials[index % 3].avatar,
        stars: 5
      }))
    : fallbackTestimonials;

  return (
    <section className="py-8 md:py-12 bg-gradient-to-b from-osu-gray/5 via-muted/20 to-osu-gray/8 relative overflow-hidden">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-osu-scarlet/2 via-transparent to-osu-gray/3" aria-hidden />
      
      <div className="container px-4 relative">
        <div className="text-center mb-6">
          <h2 className="font-heading text-2xl md:text-3xl font-bold mb-3 text-foreground">
            Real Stories, Real Progress
          </h2>
          <p className="text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Hear from community members about their transformative experiences
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3 max-w-4xl mx-auto">
          {isLoading ? (
            // Loading skeletons
            Array.from({ length: 3 }).map((_, index) => (
              <Card key={index} className="bg-white/95">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Skeleton className="w-11 h-11 rounded-full" />
                    <div>
                      <Skeleton className="h-4 w-20 mb-1" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                  <Skeleton className="h-3 w-24 mb-3" />
                  <Skeleton className="h-16 w-full mb-3" />
                  <Skeleton className="h-3 w-32" />
                </CardContent>
              </Card>
            ))
          ) : (
            testimonials.map((testimonial, index) => (
              <Card 
                key={index} 
                className="bg-white/95 backdrop-blur-sm shadow-xl hover:shadow-2xl transition-all duration-300 border border-osu-gray/10 md:hover:scale-[1.02] md:hover:border-osu-scarlet/20 group relative overflow-hidden"
              >
                {/* Subtle OSU accent */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-osu-scarlet via-osu-scarlet-dark to-osu-gray" aria-hidden />
                
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-3 mb-3">
                    <img 
                      src={testimonial.avatar} 
                      alt={`${testimonial.name} testimonial photo`} 
                      className="w-11 h-11 rounded-full object-cover border-2 border-osu-scarlet/30 shadow-md" 
                    />
                    <div>
                      <div className="font-semibold text-foreground text-sm">{testimonial.name}</div>
                      <div className="text-xs text-muted-foreground">{testimonial.location}</div>
                    </div>
                  </div>
                  
                  <div className="flex mb-3">
                    {Array.from({ length: testimonial.stars }).map((_, starIndex) => (
                      <span key={starIndex} className="text-osu-scarlet text-base">★</span>
                    ))}
                  </div>
                  
                  <div className="text-osu-gray/30 text-3xl mb-2 leading-none" aria-hidden>
                    &quot;
                  </div>
                  <p className="text-sm text-foreground leading-relaxed mb-3 group-hover:text-foreground/90 transition-colors">
                    {testimonial.quote}
                  </p>
                  
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Heart className="h-3 w-3 text-osu-scarlet/80" aria-hidden />
                    <span>Verified Community Member</span>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </section>
  );
};
