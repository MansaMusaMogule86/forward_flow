import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import SearchFilters from "@/components/resources/SearchFilters";
import ResourceCard from "@/components/resources/ResourceCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search as SearchIcon, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { usePagination } from "@/hooks/usePagination";
import { useDebounce } from "@/hooks/useDebounce";
import { DataPagination } from "@/components/ui/data-pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { BreadcrumbSchema } from "@/components/seo/BreadcrumbSchema";
import { createSupabaseStorageGuard, isMissingSupabaseFieldError } from "@/lib/supabaseSchemaGuards";

// Import hero image
import communitySearchResources from "@/assets/images/community/search-resources.jpg";

type QuickFilter = "all" | "emergency" | "ongoing" | "new" | "partner";

interface Resource {
  id: string;
  name: string;
  title?: string;
  organization: string;
  description: string;
  category: string;
  type: string;
  county: string;
  city: string;
  state: string;
  state_code: string;
  phone: string;
  email?: string;
  website_url: string;
  address: string;
  tags?: string[];
  justice_friendly: boolean;
  verified: boolean;
  rating: number;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

const resourcesRatingGuard = createSupabaseStorageGuard('ffe_resources_rating_unavailable');

const sanitizeSearchTermForOrFilter = (value: string) => value.replace(/[,%().]/g, '').trim();

const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get("q") || "");
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [county, setCounty] = useState(searchParams.get("county") || "");
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const { toast } = useToast();

  const resourcesPagination = usePagination({ items: resources, itemsPerPage: 20 });

  useEffect(() => {
    document.title = "Search Resources | Forward Focus Elevation";
    fetchResources();
  }, [debouncedSearchTerm, county, selectedTypes, quickFilter]);

  useEffect(() => {
    const q = searchParams.get("q");
    const c = searchParams.get("county");
    if (q) setSearchTerm(q);
    if (c) setCounty(c);
  }, [searchParams]);

  const buildResourcesQuery = (sortByRating = true) => {
    let query = supabase.from("resources").select("*");
    const sanitizedSearchTerm = sanitizeSearchTermForOrFilter(debouncedSearchTerm);

    if (sanitizedSearchTerm) {
      query = query.or(`name.ilike.%${sanitizedSearchTerm}%,organization.ilike.%${sanitizedSearchTerm}%,description.ilike.%${sanitizedSearchTerm}%`);
    }

    if (county) {
      query = query.eq("county", county);
    }

    if (selectedTypes.length > 0) {
      query = query.in("type", selectedTypes);
    }

    switch (quickFilter) {
      case "emergency":
        query = query.in("type", ["Emergency Services", "Crisis Intervention", "Legal Aid"]);
        break;
      case "ongoing":
        query = query.in("type", ["Employment", "Housing", "Mental Health", "Substance Abuse"]);
        break;
      case "new":
        query = query.gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
        break;
      case "partner":
        query = query.eq("verified", true);
        break;
    }

    if (sortByRating && !resourcesRatingGuard.isUnavailable()) {
      return query.order("rating", { ascending: false }).order("created_at", { ascending: false });
    }

    return query.order("created_at", { ascending: false });
  };

  const fetchResources = async () => {
    setLoading(true);
    try {
      let { data, error } = await buildResourcesQuery();

      if (isMissingSupabaseFieldError(error, 'rating')) {
        resourcesRatingGuard.markUnavailable();
        ({ data, error } = await buildResourcesQuery(false));
      }

      if (error) throw error;
      setResources((data || []).map((resource) => ({ ...resource, rating: Number(resource.rating || 0) })) as Resource[]);
    } catch (error) {
      console.error("Error fetching resources:", error);
      toast({
        title: "Error",
        description: "Failed to load resources. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchTerm.trim()) params.set("q", searchTerm.trim());
    if (county) params.set("county", county);
    setSearchParams(params);
  };

  const getResultsText = () => {
    const count = resources.length;
    if (loading) return "Searching...";
    if (count === 0) return "No resources found";
    return `${count} resource${count !== 1 ? "s" : ""} found`;
  };

  return (
    <main id="main" className="min-h-screen bg-gradient-osu-subtle">
      <BreadcrumbSchema crumbs={[{ name: 'Search Resources', path: '/search' }]} />
      <div className="bg-gradient-osu-primary border-b border-osu-scarlet/20 mb-12">
        <div className="container py-16">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="font-heading text-5xl md:text-6xl font-bold mb-6 text-white">Find Resources</h1>
            <p className="text-xl text-white leading-relaxed">
              Search our comprehensive directory of resources, organizations, and support services
              for justice-impacted individuals and families.
            </p>
          </div>
        </div>
      </div>

      <div className="container">
        <div className="max-w-7xl mx-auto">{/* Hero Section */}
          <div className="relative mb-12 bg-card rounded-2xl shadow-xl border border-osu-gray/20 overflow-hidden">
            <img
              src={communitySearchResources}
              alt="Diverse individuals using search and digital resources in a community center"
              className="w-full h-64 object-cover opacity-20"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-osu-scarlet/10 to-osu-gray/10 flex items-center justify-center">
              <div className="text-center text-osu-scarlet max-w-4xl px-8">
                <h2 className="font-heading text-2xl md:text-3xl font-semibold mb-4">Resource Directory</h2>
                <p className="text-osu-gray">
                  Over 500+ verified resources available across Ohio
                </p>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-osu-gray h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Search resources, organizations, or services..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-osu-gray/30 focus:border-osu-scarlet focus:ring-osu-scarlet/20"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setShowFilters(!showFilters)}
                  className={`border-osu-gray/30 hover:bg-osu-scarlet/5 ${showFilters ? "bg-osu-scarlet/10 border-osu-scarlet" : ""}`}
                >
                  <Filter className="h-4 w-4" />
                </Button>
                <Button
                  type="submit"
                  className="px-8 bg-gradient-to-r from-osu-scarlet to-osu-gray hover:from-osu-scarlet/90 hover:to-osu-gray/90 text-white shadow-lg"
                >
                  Search
                </Button>
              </div>
            </div>
          </form>

          {/* Filters */}
          {showFilters && (
            <div className="mb-6 p-4 border border-osu-gray/20 rounded-lg bg-osu-gray/5">
              <SearchFilters
                county={county}
                selectedTypes={selectedTypes}
                quickFilter={quickFilter}
                onCountyChange={setCounty}
                onTypesChange={setSelectedTypes}
                onQuickFilterChange={setQuickFilter}
              />
            </div>
          )}

          {/* Active Filters */}
          {(searchTerm || county || selectedTypes.length > 0 || quickFilter !== "all") && (
            <div className="mb-6">
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-sm font-medium text-osu-scarlet">Active filters:</span>
                {searchTerm && (
                  <Badge variant="secondary" className="flex items-center gap-1 bg-osu-scarlet/10 text-osu-scarlet border-osu-scarlet/20">
                    <SearchIcon className="h-3 w-3" />
                    "{searchTerm}"
                  </Badge>
                )}
                {county && (
                  <Badge variant="secondary" className="flex items-center gap-1 bg-osu-gray/10 text-osu-gray border-osu-gray/20">
                    {county}
                  </Badge>
                )}
                {selectedTypes.map((type) => (
                  <Badge key={type} variant="secondary" className="bg-osu-scarlet/10 text-osu-scarlet border-osu-scarlet/20">
                    {type}
                  </Badge>
                ))}
                {quickFilter !== "all" && (
                  <Badge variant="secondary" className="bg-osu-gray/10 text-osu-gray border-osu-gray/20">
                    {quickFilter === "emergency" && "Emergency Services"}
                    {quickFilter === "ongoing" && "Ongoing Support"}
                    {quickFilter === "new" && "New Resources"}
                    {quickFilter === "partner" && "Partner Recommended"}
                  </Badge>
                )}
              </div>
            </div>
          )}

          <Separator className="mb-6 bg-osu-gray/20" />

          {/* Results Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-osu-scarlet">{getResultsText()}</h2>
          </div>

          {/* Results */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-48 bg-muted rounded-lg"></div>
                </div>
              ))}
            </div>
          ) : resources.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {resourcesPagination.paginatedItems.map((resource) => (
                  <ResourceCard
                    key={resource.id}
                    resource={resource}
                  />
                ))}
              </div>
              <DataPagination
                currentPage={resourcesPagination.currentPage}
                totalPages={resourcesPagination.totalPages}
                onPageChange={resourcesPagination.goToPage}
                hasNextPage={resourcesPagination.hasNextPage}
                hasPreviousPage={resourcesPagination.hasPreviousPage}
              />
            </>
          ) : (
            <div className="text-center py-12">
              <SearchIcon className="mx-auto h-12 w-12 text-osu-gray mb-4" />
              <h3 className="text-lg font-medium mb-2 text-osu-scarlet">No resources found</h3>
              <p className="text-osu-gray mb-4">
                Try adjusting your search terms or filters to find more results.
              </p>
              <Button
                variant="outline"
                className="border-osu-gray/30 text-osu-gray hover:bg-osu-scarlet hover:text-white"
                onClick={() => {
                  setSearchTerm("");
                  setCounty("");
                  setSelectedTypes([]);
                  setQuickFilter("all");
                  setSearchParams({});
                }}
              >
                Clear all filters
              </Button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
};
export default Search;
