import { useLocation, useNavigate } from "react-router-dom";
import logo from "@/assets/images/branding/logo-transparent.png";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home, Search, ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Check if this is a sensitive route - don't log details
  const isSensitiveRoute = location.pathname.startsWith('/admin') || 
                           location.pathname.startsWith('/dashboard') ||
                           location.pathname.startsWith('/portal');

  useEffect(() => {
    // Sanitized logging - don't reveal admin structure
    if (isSensitiveRoute) {
      console.error("404 Error: Protected route access attempted");
    } else {
      console.error("404 Error: Page not found");
    }
  }, [isSensitiveRoute]);

  const popularPages = [
    { name: "Home", path: "/" },
    { name: "Get Help Now", path: "/help" },
    { name: "Focus Flow Elevation Hub", path: "/learn" },
    { name: "Discover Resources", path: "/discover" },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-white to-secondary/5">
      <div className="text-center max-w-2xl px-4 py-12">
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <img 
            src={logo}
            alt="Forward Focus Elevation"
            className="h-20 w-auto"
          />
        </div>

        {/* 404 Message */}
        <h1 className="text-8xl font-bold text-primary mb-4">404</h1>
        <h2 className="text-3xl font-semibold text-foreground mb-4">
          Page Not Found
        </h2>
        <p className="text-lg text-foreground/70 mb-8 max-w-md mx-auto">
          We couldn't find the page you're looking for. But don't worry—your journey toward growth and healing continues.
        </p>

        {/* Navigation Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <Button 
            onClick={() => navigate("/")}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
            size="lg"
          >
            <Home className="mr-2 h-5 w-5" />
            Go Home
          </Button>
          <Button 
            onClick={() => navigate(-1)}
            variant="outline"
            size="lg"
          >
            <ArrowLeft className="mr-2 h-5 w-5" />
            Go Back
          </Button>
          <Button 
            onClick={() => navigate("/discover")}
            variant="outline"
            size="lg"
          >
            <Search className="mr-2 h-5 w-5" />
            Search Resources
          </Button>
        </div>

        {/* Popular Pages */}
        <div className="border-t border-border pt-8">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Popular Pages
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {popularPages.map((page) => (
              <Button
                key={page.path}
                onClick={() => navigate(page.path)}
                variant="ghost"
                className="hover:bg-primary/10"
              >
                {page.name}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;