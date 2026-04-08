import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Award, Star, TrendingUp, Quote } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { SEOHead } from "@/components/seo/SEOHead";
import { StructuredData } from "@/components/seo/StructuredData";
import { BreadcrumbSchema } from "@/components/seo/BreadcrumbSchema";
import { createSupabaseStorageGuard, isMissingSupabaseTableError } from "@/lib/supabaseSchemaGuards";

interface SuccessStory {
  id: string;
  title: string;
  story: string;
  outcome: string | null;
  participant_name: string | null;
  participant_testimonial: string | null;
  featured: boolean;
  published_at: string;
}

const successStoriesGuard = createSupabaseStorageGuard('ffe_success_stories_unavailable');

export default function SuccessStories() {
  const [stories, setStories] = useState<SuccessStory[]>([]);
  const [loading, setLoading] = useState(true);

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "Success Stories",
    "description": "Real stories of transformation, resilience, and success from our community",
    "url": "https://forward-focus-elevation.org/success-stories",
    "publisher": {
      "@type": "Organization",
      "name": "Forward Focus Elevation"
    }
  };

  useEffect(() => {
    loadStories();

    if (successStoriesGuard.isUnavailable()) {
      return;
    }

    // Set up realtime subscription
    const channel = supabase
      .channel('public-success-stories')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'success_stories'
        },
        () => {
          loadStories();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadStories = async () => {
    if (successStoriesGuard.isUnavailable()) {
      setStories([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('success_stories')
        .select('*')
        .eq('published', true)
        .order('featured', { ascending: false })
        .order('published_at', { ascending: false });

      if (error) {
        if (isMissingSupabaseTableError(error, 'success_stories')) {
          successStoriesGuard.markUnavailable();
          setStories([]);
          return;
        }

        console.error('Error loading success stories:', error);
        toast({
          title: "Error",
          description: "Failed to load success stories",
          variant: "destructive",
        });
        return;
      }

      // Successfully loaded - set stories (even if empty array)
      setStories(data || []);
    } catch (error: unknown) {
      if (isMissingSupabaseTableError(error, 'success_stories')) {
        successStoriesGuard.markUnavailable();
        setStories([]);
        return;
      }

      console.error('Unexpected error loading success stories:', error);
      toast({
        title: "Error",
        description: "Failed to load success stories",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const featuredStories = stories.filter(s => s.featured);
  const regularStories = stories.filter(s => !s.featured);

  return (
    <>
      <SEOHead
        title="Success Stories"
        description="Real stories of transformation, resilience, and success from our community. Read inspiring success stories from individuals who have overcome challenges and rebuilt their lives."
        path="/success-stories"
        type="article"
      />
      <StructuredData data={structuredData} />
      <BreadcrumbSchema crumbs={[{ name: 'Success Stories', path: '/success-stories' }]} />

      <main id="main" className="min-h-screen">
        {/* Hero Section */}
        <section className="relative bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-white py-20">
          <div className="container">
            <div className="max-w-3xl mx-auto text-center space-y-4 animate-fade-in">
              <Badge variant="secondary" className="mb-4">
                <Award className="w-4 h-4 mr-2" />
                Impact Stories
              </Badge>
              <h1 className="text-4xl md:text-5xl font-bold leading-tight">
                Success Stories
              </h1>
              <p className="text-xl text-white/90">
                Real stories of transformation, resilience, and success from our community
              </p>
            </div>
          </div>
        </section>

        <div className="container py-16">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : stories.length === 0 ? (
            <Card className="max-w-2xl mx-auto">
              <CardContent className="p-12 text-center">
                <Award className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-2">More Stories Coming Soon</h2>
                <p className="text-muted-foreground">
                  Check back soon to read inspiring success stories from our community
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-12">
              {/* Featured Stories */}
              {featuredStories.length > 0 && (
                <section className="space-y-6">
                  <div className="text-center">
                    <Badge variant="default" className="mb-4">
                      <Star className="w-4 h-4 mr-2" />
                      Featured Stories
                    </Badge>
                    <h2 className="text-3xl font-bold">Highlighted Successes</h2>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {featuredStories.map((story) => (
                      <Card key={story.id} className="hover-scale border-primary/20 shadow-lg">
                        <CardHeader>
                          <div className="flex items-start justify-between mb-2">
                            <Badge variant="default">
                              <Star className="w-3 h-3 mr-1" />
                              Featured
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {new Date(story.published_at).toLocaleDateString()}
                            </span>
                          </div>
                          <CardTitle className="text-2xl">{story.title}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{story.story}</p>

                          {story.outcome && (
                            <div className="p-4 bg-primary/5 rounded-lg border-l-4 border-primary">
                              <p className="text-sm font-medium mb-1 flex items-center gap-2">
                                <TrendingUp className="w-4 h-4" />
                                Outcome
                              </p>
                              <p className="text-sm text-muted-foreground">{story.outcome}</p>
                            </div>
                          )}

                          {story.participant_testimonial && story.participant_name && (
                            <div className="p-4 bg-muted rounded-lg">
                              <Quote className="w-5 h-5 text-primary mb-2" />
                              <p className="text-sm italic mb-2">"{story.participant_testimonial}"</p>
                              <p className="text-xs text-muted-foreground">— {story.participant_name}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </section>
              )}

              {/* Regular Stories */}
              {regularStories.length > 0 && (
                <section className="space-y-6">
                  <div className="text-center">
                    <h2 className="text-3xl font-bold">More Success Stories</h2>
                    <p className="text-muted-foreground mt-2">
                      Celebrating transformations across our community
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {regularStories.map((story) => (
                      <Card key={story.id} className="hover-scale">
                        <CardHeader>
                          <CardTitle className="text-lg">{story.title}</CardTitle>
                          <CardDescription>
                            {new Date(story.published_at).toLocaleDateString()}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <p className="text-sm leading-relaxed line-clamp-6">
                            {story.story}
                          </p>

                          {story.participant_name && (
                            <div className="pt-3 border-t">
                              <p className="text-xs text-muted-foreground">
                                Story of: {story.participant_name}
                              </p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
