import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { 
  Building2, 
  MapPin, 
  Phone, 
  Globe, 
  Mail, 
  Search, 
  Filter,
  ShieldCheck,
  Users,
  Calendar,
  ExternalLink
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { ContactAccessRequest } from "@/components/security/ContactAccessRequest";
import { BreadcrumbSchema } from "@/components/seo/BreadcrumbSchema";

interface Organization {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  verified: boolean;
  organization_type?: string;
  created_at: string;
  updated_at: string;
}

const Organizations = () => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [filteredOrgs, setFilteredOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [verifiedFilter, setVerifiedFilter] = useState("");
  const { user } = useAuth();
  const { isAdmin } = useAdminCheck(user);
  const { toast } = useToast();

  useEffect(() => {
    document.title = "Partner Organizations | Forward Focus Elevation";
  }, []);

  const fetchOrganizations = async () => {
    try {
      // Direct query to organizations table
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('verified', true)
        .order('name', { ascending: true });

      if (error) {
        throw error;
      }

      setOrganizations(data || []);
    } catch (error) {
      console.error("Error fetching organizations:", error);
      toast({
        title: "Error",
        description: "Failed to load organizations. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchOrganizations();
    } else {
      setLoading(false); // Stop loading if not admin (so we can show the restricted view)
    }
  }, [isAdmin]);

  useEffect(() => {
    const filterOrganizations = () => {
      let filtered = organizations;

      // Search term filter
      if (searchTerm.trim()) {
        filtered = filtered.filter(org =>
          org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          org.city?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      // City filter
      if (cityFilter && cityFilter !== "all") {
        filtered = filtered.filter(org => org.city === cityFilter);
      }

      // Verified filter
      if (verifiedFilter && verifiedFilter !== "all") {
        const isVerified = verifiedFilter === "verified";
        filtered = filtered.filter(org => org.verified === isVerified);
      }

      setFilteredOrgs(filtered);
    };

    filterOrganizations();
  }, [organizations, searchTerm, cityFilter, verifiedFilter]);

  // Early returns MUST be after all hooks
  if (!user) {
    return (
      <main id="main" className="container py-10 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Authentication Required</h2>
          <p className="text-muted-foreground mb-6">You must be signed in to access partner organizations.</p>
          <Button asChild>
            <a href="/auth">Sign In</a>
          </Button>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main id="main" className="container py-10 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Checking permissions...</p>
        </div>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main id="main" className="container py-10 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Admin Access Required</h2>
          <p className="text-muted-foreground mb-6">This page is restricted to administrators only.</p>
          <Button asChild variant="outline">
            <a href="/">Return Home</a>
          </Button>
        </div>
      </main>
    );
  }

  // All major Ohio cities
  const allOhioCities = [
    "Akron", "Athens", "Barberton", "Beavercreek", "Bowling Green", "Canton", "Cincinnati",
    "Cleveland", "Columbus", "Dayton", "Delaware", "Elyria", "Fairborn", "Fairfield", 
    "Findlay", "Hamilton", "Kettering", "Lima", "Lorain", "Mansfield", "Marion", 
    "Massillon", "Medina", "Mentor", "Middletown", "Newark", "Norwood", "Parma", 
    "Portsmouth", "Reynoldsburg", "Sandusky", "Springfield", "Steubenville", "Toledo", 
    "Upper Arlington", "Warren", "Westerville", "Westlake", "Whitehall", "Xenia", 
    "Youngstown", "Zanesville"
  ].sort();

  const uniqueCities = [...new Set(organizations.map(org => org.city))].sort();
  
  // Combine and sort all cities, marking which ones have organizations
  const cityOptions = allOhioCities.map(city => ({
    value: city,
    label: city,
    hasOrganizations: uniqueCities.includes(city)
  }));

  const clearFilters = () => {
    setSearchTerm("");
    setCityFilter("all");
    setVerifiedFilter("all");
  };

  const formatPhoneNumber = (phone: string) => {
    if (!phone) return null;
    return phone.startsWith('tel:') ? phone : `tel:${phone}`;
  };

  return (
    <main id="main" className="container py-8">
      <BreadcrumbSchema crumbs={[{ name: 'Organizations', path: '/organizations' }]} />
      <div className="max-w-7xl mx-auto">

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="hover:shadow-lg transition-all duration-300 border-0 shadow-md">
            <CardContent className="p-8 text-center">
              <div className="text-4xl font-bold text-primary mb-2">{organizations.length}</div>
              <div className="text-base font-medium text-foreground">Partner Organizations</div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-all duration-300 border-0 shadow-md">
            <CardContent className="p-8 text-center">
              <div className="text-4xl font-bold text-primary mb-2">{uniqueCities.length}</div>
              <div className="text-base font-medium text-foreground">Cities Served</div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-all duration-300 border-0 shadow-md">
            <CardContent className="p-8 text-center">
              <div className="text-4xl font-bold text-primary mb-2">
                {organizations.filter(org => org.verified).length}
              </div>
              <div className="text-base font-medium text-foreground">Verified Partners</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center justify-center gap-2">
              <Filter className="h-5 w-5" />
              Find Organizations
            </CardTitle>
            <CardDescription className="text-center">
              Search and filter our partner directory to find the right support
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search organizations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
               <Select value={cityFilter} onValueChange={setCityFilter}>
                 <SelectTrigger>
                   <SelectValue placeholder="Filter by city" />
                 </SelectTrigger>
                 <SelectContent className="max-h-60">
                   <SelectItem value="all">All cities</SelectItem>
                   <SelectItem value="ohio">Ohio (All locations)</SelectItem>
                   {cityOptions.map(city => (
                     <SelectItem 
                       key={city.value} 
                       value={city.value}
                       disabled={!city.hasOrganizations}
                       className={!city.hasOrganizations ? "opacity-50 blur-[0.5px] cursor-not-allowed" : ""}
                     >
                       {city.label}
                        {!city.hasOrganizations && (
                          <span className="text-xs text-muted-foreground ml-2">(Coming Soon)</span>
                        )}
                     </SelectItem>
                   ))}
                 </SelectContent>
               </Select>
              <Select value={verifiedFilter} onValueChange={setVerifiedFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Verification status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All organizations</SelectItem>
                  <SelectItem value="verified">Verified partners only</SelectItem>
                  <SelectItem value="unverified">Community submitted</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                variant="outline" 
                onClick={clearFilters}
                disabled={!searchTerm && cityFilter === "all" && verifiedFilter === "all"}
              >
                Clear Filters
              </Button>
            </div>
            
            {/* Active Filters */}
            {(searchTerm || (cityFilter && cityFilter !== "all") || (verifiedFilter && verifiedFilter !== "all")) && (
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="text-sm font-medium">Active filters:</span>
                {searchTerm && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Search className="h-3 w-3" />
                    "{searchTerm}"
                  </Badge>
                )}
                {cityFilter && cityFilter !== "all" && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {cityFilter}
                  </Badge>
                )}
                {verifiedFilter && verifiedFilter !== "all" && (
                  <Badge variant="secondary">
                    {verifiedFilter === "verified" ? "Verified Partners" : "Community Submitted"}
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Separator className="mb-8" />

        {/* Results */}
        <div className="mb-6 text-center">
          <h2 className="text-xl font-semibold">
            {filteredOrgs.length === 0 
              ? "No organizations found" 
              : `${filteredOrgs.length} organization${filteredOrgs.length !== 1 ? 's' : ''} found`
            }
          </h2>
        </div>

        {filteredOrgs.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No organizations found</h3>
              <p className="text-muted-foreground mb-4">
                Try adjusting your search terms or filters to find more results.
              </p>
              <Button variant="outline" onClick={clearFilters}>
                Clear all filters
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredOrgs.map((org) => (
              <Card key={org.id} className="hover:shadow-xl transition-all duration-300 border-0 shadow-md">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <CardTitle className="text-xl font-bold mb-3">{org.name}</CardTitle>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {org.verified ? (
                          <Badge variant="default" className="flex items-center gap-1 font-medium">
                            <ShieldCheck className="h-3 w-3" />
                            Verified Partner
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="flex items-center gap-1 font-medium border-primary/20">
                            <Users className="h-3 w-3" />
                            Community Verified
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <CardDescription className="line-clamp-3 text-base leading-relaxed">
                    {org.organization_type || "Supporting the community with various services and programs."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Location */}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{org.city || 'N/A'}, {org.state || 'N/A'}</span>
                    {org.address && isAdmin && (
                      <span>• {org.address}</span>
                    )}
                  </div>

                  {/* Contact Info - Protected for non-admin users */}
                  <div className="space-y-2">
                    {org.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        {isAdmin ? (
                          <a 
                            href={formatPhoneNumber(org.phone) || undefined}
                            className="text-primary hover:underline"
                          >
                            {org.phone}
                          </a>
                        ) : (
                          <span className="text-muted-foreground">
                            {org.phone === 'Contact access required' ? (
                              <Badge variant="outline" className="text-xs">Contact Access Required</Badge>
                            ) : (
                              org.phone
                            )}
                          </span>
                        )}
                      </div>
                    )}
                    
                    {org.email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        {isAdmin ? (
                          <a 
                            href={`mailto:${org.email}`}
                            className="text-primary hover:underline"
                          >
                            {org.email}
                          </a>
                        ) : (
                          <span className="text-muted-foreground">
                            {org.email === 'Contact access required' ? (
                              <Badge variant="outline" className="text-xs">Contact Access Required</Badge>
                            ) : (
                              org.email
                            )}
                          </span>
                        )}
                      </div>
                    )}
                    
                    {org.website && (
                      <div className="flex items-center gap-2 text-sm">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <a 
                          href={org.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline flex items-center gap-1"
                        >
                          Visit Website
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}

                    {user && !isAdmin && (org.phone || org.email) && (
                      <ContactAccessRequest
                        organizationId={org.id}
                        organizationName={org.name}
                      />
                    )}

                    {!user && (
                      <div className="bg-muted/50 p-3 rounded-lg text-sm text-center">
                        <p className="text-muted-foreground">
                          <a href="/auth" className="text-primary hover:underline">Sign in</a> to access additional features
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Updated date */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
                    <Calendar className="h-3 w-3" />
                    <span>Updated {new Date(org.updated_at).toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Call to Action */}
        {organizations.length > 0 && (
          <section className="mt-12">
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-8 text-center">
                <h2 className="font-heading text-2xl font-semibold mb-4">
                  Want to Join Our Partner Network?
                </h2>
                <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                  If your organization is committed to supporting justice-impacted individuals, 
                  we'd love to explore a partnership.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button asChild size="lg">
                    <a href="/partners/request-partnership">
                      Request Partnership
                    </a>
                  </Button>
                  <Button asChild variant="outline" size="lg">
                    <a href="/partners">
                      Learn More About Partners
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>
        )}
      </div>
    </main>
  );
};
export default Organizations;