import { useEffect, useState } from "react";
import { useSearchParams, NavLink } from "react-router-dom";
import AIResourceDiscovery from "@/components/ai/AIResourceDiscovery";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Bot, Sparkles, ArrowLeft } from "lucide-react";

// Import hero image
import communitySearchResources from "@/assets/images/community/search-resources.jpg";


const Discover = () => {
  const [searchParams] = useSearchParams();
  const [county] = useState(searchParams.get("county") || "");
  const [showAIDiscovery, setShowAIDiscovery] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "AI Resource Discovery | Forward Focus Elevation";
    
    // Simulate initial load
    const timer = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <main id="main" className="min-h-screen bg-gradient-osu-subtle">
        {/* Hero Skeleton */}
        <div className="bg-gradient-osu-primary border-b border-osu-scarlet/20 mb-12">
          <div className="container py-16">
            <div className="max-w-4xl mx-auto text-center space-y-6">
              <Skeleton className="h-14 w-3/4 mx-auto bg-white/20" />
              <Skeleton className="h-6 w-full mx-auto bg-white/20" />
              <Skeleton className="h-6 w-2/3 mx-auto bg-white/20" />
            </div>
          </div>
        </div>
        
        <div className="container">
          <div className="max-w-7xl mx-auto">
            <Skeleton className="h-10 w-48 mb-6" />
            
            {/* Hero Image Skeleton */}
            <Skeleton className="h-64 w-full rounded-2xl mb-12" />

            {/* Cards Grid Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[...Array(2)].map((_, i) => (
                <Card key={i}>
                  <CardHeader className="space-y-2">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-full" />
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Skeleton className="h-20 w-full" />
                    <div className="space-y-2">
                      {[...Array(4)].map((_, j) => (
                        <Skeleton key={j} className="h-4 w-full" />
                      ))}
                    </div>
                    <Skeleton className="h-10 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main id="main" className="min-h-screen bg-gradient-osu-subtle">
      {/* Hero Section */}
      <div className="bg-gradient-osu-primary border-b border-osu-scarlet/20 mb-12">
        <div className="container py-16">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="font-heading text-5xl md:text-6xl font-bold mb-6 text-white">AI Resource Discovery</h1>
            <p className="text-xl text-white leading-relaxed">
              Find personalized support services through <strong>The Collective</strong> across all 88 Ohio counties using our AI-powered resource navigator.
              Get recommendations tailored to your specific needs and location.
            </p>
          </div>
        </div>
      </div>
      
      <div className="container">
        <div className="max-w-7xl mx-auto">
          {/* Back to Quick Actions Button */}
          <div className="mb-6">
            <Button asChild variant="outline" className="border-osu-gray/30 text-osu-gray hover:bg-osu-scarlet hover:text-white">
              <NavLink to="/partners?tab=actions" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Quick Actions
              </NavLink>
            </Button>
          </div>
          
          {/* AI Resource Discovery Interface */}
          <div className="relative mb-12 bg-card rounded-2xl shadow-xl border border-osu-gray/20 overflow-hidden">
            <img 
              src={communitySearchResources} 
              alt="Diverse individuals using AI-powered resource discovery in a community center"
              className="w-full h-64 object-cover opacity-20"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-osu-scarlet/10 to-osu-gray/10 flex items-center justify-center">
              <div className="text-center text-osu-scarlet max-w-4xl px-8">
                <h2 className="font-heading text-2xl md:text-3xl font-semibold mb-4">Smart Resource Navigator</h2>
                <p className="text-osu-gray">
                  Tell us what you need in your own words, and our AI will find the right resources for you
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-osu-scarlet/20 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-osu-scarlet/5 to-osu-gray/5">
                  <CardTitle className="flex items-center gap-2 text-osu-scarlet">
                    <Sparkles className="h-5 w-5" />
                    AI-Powered Resource Discovery
                  </CardTitle>
                  <CardDescription className="text-osu-gray">
                    Get personalized recommendations based on your specific needs and location
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-4">
                    <p className="text-sm text-osu-gray">
                      Our AI assistant understands your needs in natural language and recommends the most relevant resources 
                      across all 88 Ohio counties, complete with explanations and contact information.
                    </p>
                    <ul className="text-sm text-osu-gray space-y-1">
                      <li>• Personalized resource matching</li>
                      <li>• Chat history and email features</li>
                      <li>• Justice-friendly resource identification</li>
                      <li>• Real-time availability information</li>
                    </ul>
                    <Button 
                      onClick={() => setShowAIDiscovery(true)}
                      className="w-full bg-gradient-to-r from-osu-scarlet to-osu-gray hover:from-osu-scarlet/90 hover:to-osu-gray/90 text-white"
                    >
                      <Bot className="h-4 w-4 mr-2" />
                      Start AI Discovery
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-osu-gray/20 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-osu-gray/5 to-osu-scarlet/5">
                  <CardTitle className="flex items-center gap-2 text-osu-gray">
                    <Bot className="h-5 w-5" />
                    Quick Search Examples
                  </CardTitle>
                  <CardDescription className="text-osu-gray">
                    Try asking the AI about these common needs
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-2">
                    {[
                      "Find housing assistance in my area",
                      "I need help with food and basic needs", 
                      "Looking for job training programs",
                      "Need legal aid for family issues",
                      "Mental health support services",
                      "Help for someone coming home from prison"
                    ].map((query, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        className="w-full text-left justify-start h-auto p-3 text-xs hover:bg-osu-scarlet/10 hover:border-osu-scarlet/30"
                        onClick={() => {
                          setShowAIDiscovery(true);
                        }}
                      >
                        {query}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* AI Resource Discovery Modal */}
      <AIResourceDiscovery
        isOpen={showAIDiscovery}
        onClose={() => setShowAIDiscovery(false)}
        location={county}
      />
    </main>
  );
};

export default Discover;