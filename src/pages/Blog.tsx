import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Calendar, Clock, Tag, ArrowRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { blogPosts, categories, allTags, getRecentPosts } from "@/data/blog/posts";
import {
  generateBlogSchema,
  generateOrganizationSchema,
  generateWebsiteSchema,
  generateBreadcrumbSchema,
  injectSchema
} from "@/lib/seo-schema";
import { useState } from "react";

export default function Blog() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const recentPosts = getRecentPosts(3);

  const filteredPosts = blogPosts.filter(post => {
    const matchesSearch = searchQuery === "" ||
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = selectedCategory === null || post.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <>
      <Helmet>
        <title>Knowledge Hub | Forward Focus Elevation - Resources for Second Chances</title>
        <meta
          name="description"
          content="Expert guides on second chance housing, expungement, victim compensation, and AI-powered reentry resources for Ohio's 88 counties."
        />
        <meta
          name="keywords"
          content="second chance resources, Ohio reentry, victim services, expungement guide, trauma-informed care, housing assistance"
        />
        <link rel="canonical" href="https://forward-focus-elevation.org/blog" />

        {/* Open Graph */}
        <meta property="og:title" content="Forward Focus Elevation Knowledge Hub" />
        <meta property="og:description" content="Resources and insights for reentry success, victim support, and life transformation in Ohio" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://forward-focus-elevation.org/blog" />
        <meta property="og:site_name" content="Forward Focus Elevation" />
        <meta property="og:image" content="https://forward-focus-elevation.org/og-image.jpg" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="Forward Focus Elevation - CEO Logo" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Forward Focus Elevation Knowledge Hub" />
        <meta name="twitter:description" content="Resources for second chances in Ohio" />
        <meta name="twitter:image" content="https://forward-focus-elevation.org/og-image.jpg" />
        <meta name="twitter:image:alt" content="Forward Focus Elevation - CEO Logo" />

        {/* Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify(generateBlogSchema())}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(generateOrganizationSchema())}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(generateBreadcrumbSchema([
            { name: "Home", url: "/" },
            { name: "Knowledge Hub", url: "/blog" }
          ]))}
        </script>
      </Helmet>

      <div className="min-h-screen bg-white">
        {/* Hero Section */}
        <section className="relative py-20 lg:py-28 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-osu-scarlet/5 to-transparent" />
          <div className="container-custom relative z-10">
            <div className="max-w-3xl mx-auto text-center">
              <span className="inline-block px-4 py-1.5 bg-osu-scarlet/20 text-osu-scarlet text-sm font-medium rounded-full mb-6">
                Knowledge Hub
              </span>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 font-display">
                Resources for Your
                <span className="text-osu-scarlet"> Second Chance</span>
              </h1>
              <p className="text-lg text-foreground/80 max-w-2xl mx-auto mb-8">
                Expert guides on housing, expungement, victim services, and AI-powered tools to help you rebuild your life across Ohio's 88 counties.
              </p>

              {/* Search Bar */}
              <div className="relative max-w-xl mx-auto">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-foreground/50" />
                <Input
                  type="text"
                  placeholder="Search articles, topics, or resources..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 pr-4 py-6 bg-foreground/5 border-foreground/10 text-foreground placeholder:text-foreground/50 focus:border-osu-scarlet"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Category Filter */}
        <section className="pb-8">
          <div className="container-custom">
            <div className="flex flex-wrap justify-center gap-3">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${selectedCategory === null
                  ? "bg-osu-scarlet text-white"
                  : "bg-foreground/10 text-foreground hover:bg-foreground/20"
                  }`}
              >
                All Topics
              </button>
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${selectedCategory === category
                    ? "bg-osu-scarlet text-white"
                    : "bg-foreground/10 text-foreground hover:bg-foreground/20"
                    }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Featured/Recent Posts */}
        {selectedCategory === null && searchQuery === "" && (
          <section className="py-12">
            <div className="container-custom">
              <h2 className="text-2xl font-bold text-foreground mb-8 font-display">Latest Articles</h2>
              <div className="grid md:grid-cols-3 gap-6">
                {recentPosts.map((post) => (
                  <article
                    key={post.id}
                    className="group bg-foreground/5 rounded-xl overflow-hidden border border-foreground/10 hover:border-osu-scarlet/50 transition-all duration-300"
                  >
                    <div className="p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <span className="px-3 py-1 bg-osu-scarlet/10 text-osu-scarlet text-xs font-medium rounded-full">
                          <span className="flex items-center gap-1 text-foreground/60 text-xs">
                            <Clock className="h-3 w-3" />
                            {post.readingTime} min read
                          </span>
                        </span>
                      </div>

                      <h3 className="text-lg font-bold text-foreground mb-3 group-hover:text-osu-scarlet transition-colors line-clamp-2">
                        <Link to={`/blog/${post.slug}`}>{post.title}</Link>
                      </h3>

                      <p className="text-foreground/70 text-sm mb-4 line-clamp-2">
                        {post.excerpt}
                      </p>

                      <div className="flex items-center justify-between pt-4 border-t border-foreground/10">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-osu-scarlet/20 flex items-center justify-center">
                            <span className="text-osu-scarlet text-xs font-bold">
                              {post.author.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span className="text-foreground/80 text-xs">{post.author.name}</span>
                        </div>

                        <Link
                          to={`/blog/${post.slug}`}
                          className="inline-flex items-center gap-1 text-osu-scarlet text-sm font-medium hover:gap-2 transition-all"
                        >
                          Read <ArrowRight className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* All Posts Grid */}
        <section className="py-12">
          <div className="container-custom">
            <h2 className="text-2xl font-bold text-foreground mb-8 font-display">
              {selectedCategory ? `${selectedCategory} Articles` : "All Resources"}
            </h2>

            {filteredPosts.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPosts.map((post) => (
                  <article
                    key={post.id}
                    className="group bg-foreground/5 rounded-xl overflow-hidden border border-foreground/10 hover:border-osu-scarlet/50 transition-all duration-300"
                  >
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <span className="px-3 py-1 bg-osu-scarlet/10 text-osu-scarlet text-xs font-medium rounded-full">
                          <span className="flex items-center gap-1 text-foreground/60 text-xs">
                            <Calendar className="h-3 w-3" />
                            {new Date(post.publishedAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric'
                            })}
                          </span>
                        </span>
                      </div>

                      <h3 className="text-lg font-bold text-foreground mb-3 group-hover:text-osu-scarlet transition-colors line-clamp-2">
                        <Link to={`/blog/${post.slug}`}>{post.title}</Link>
                      </h3>

                      <p className="text-foreground/70 text-sm mb-4 line-clamp-2">
                        {post.excerpt}
                      </p>

                      <div className="flex flex-wrap gap-2 mb-4">
                        {post.tags.slice(0, 3).map(tag => (
                          <span key={tag} className="flex items-center gap-1 text-foreground/50 text-xs">
                            <Tag className="h-3 w-3" />
                            {tag}
                          </span>
                        ))}
                      </div>

                      <Link
                        to={`/blog/${post.slug}`}
                        className="inline-flex items-center gap-2 text-osu-scarlet text-sm font-medium hover:gap-3 transition-all"
                      >
                        Read Article <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <p className="text-foreground/60 text-lg">
                  No articles found matching your criteria.
                </p>
                <Button
                  variant="outline"
                  onClick={() => { setSearchQuery(""); setSelectedCategory(null); }}
                  className="mt-4 border-osu-scarlet text-osu-scarlet hover:bg-osu-scarlet/10"
                >
                  Clear Filters
                </Button>
              </div>
            )}
          </div>
        </section>

        {/* Tags Cloud */}
        <section className="py-12 border-t border-foreground/10">
          <div className="container-custom">
            <h2 className="text-xl font-bold text-foreground mb-6 font-display">Popular Topics</h2>
            <div className="flex flex-wrap gap-3">
              {allTags.slice(0, 20).map(tag => (
                <button
                  key={tag}
                  onClick={() => setSearchQuery(tag)}
                  className="px-4 py-2 bg-foreground/5 text-foreground/80 text-sm rounded-full hover:bg-foreground/20 hover:text-osu-scarlet transition-all"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16">
          <div className="container-custom">
            <div className="bg-gradient-to-r from-osu-scarlet/10 to-osu-scarlet/5 rounded-2xl p-8 md:p-12 text-center">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4 font-display">
                Need Personalized Help?
              </h2>
              <p className="text-foreground/80 max-w-2xl mx-auto mb-8">
                Our AI-powered Coach Kay is available 24/7 to help you find resources specific to your situation and location in Ohio.
              </p>
              <Button
                asChild
                className="bg-osu-scarlet hover:bg-osu-scarlet/90 text-[#0a1628] px-8 py-6 text-base font-semibold"
              >
                <Link to="/discover">Talk to Coach Kay</Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

