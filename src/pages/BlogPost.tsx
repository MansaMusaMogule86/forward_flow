import { Helmet } from "react-helmet-async";
import { Link, useParams, Navigate } from "react-router-dom";
import { Calendar, Clock, Tag, ArrowLeft, Share2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { blogPosts, getPostBySlug, getRecentPosts } from "@/data/blog/posts";
import { 
  generateArticleSchema, 
  generateOrganizationSchema,
  generateBreadcrumbSchema,
  generateFAQSchema
} from "@/lib/seo-schema";
import ReactMarkdown from "react-markdown";

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const post = slug ? getPostBySlug(slug) : undefined;
  
  if (!post) {
    return <Navigate to="/blog" replace />;
  }

  const relatedPosts = getRecentPosts(3).filter(p => p.id !== post.id).slice(0, 2);
  const articleUrl = `https://forward-focus-elevation.org/blog/${post.slug}`;
  
  // Generate schemas
  const articleSchema = generateArticleSchema(post, articleUrl);
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Blog", url: "/blog" },
    { name: post.title, url: `/blog/${post.slug}` }
  ]);

  // Extract FAQs from content for structured data
  const faqMatch = post.content.match(/Q:\s*([^\n]+)\s*A:\s*([^\n]+)/g);
  const faqs = faqMatch ? faqMatch.map(match => {
    const [q, a] = match.split(/A:\s*/);
    return {
      question: q.replace(/Q:\s*/, "").trim(),
      answer: a.trim()
    };
  }) : [];

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: post.title,
          text: post.excerpt,
          url: articleUrl,
        });
      } catch (err) {
        console.log("Share cancelled");
      }
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(articleUrl);
    }
  };

  return (
    <>
      <Helmet>
        <title>{post.seo.metaTitle}</title>
        <meta name="description" content={post.seo.metaDescription} />
        <meta name="keywords" content={post.seo.keywords.join(", ")} />
        <link rel="canonical" href={articleUrl} />
        
        {/* Open Graph */}
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.excerpt} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={articleUrl} />
        <meta property="og:site_name" content="Forward Focus Elevation" />
        {post.seo.ogImage && (
          <meta property="og:image" content={`https://forward-focus-elevation.org${post.seo.ogImage}`} />
        )}
        <meta property="article:published_time" content={post.publishedAt} />
        {post.updatedAt && (
          <meta property="article:modified_time" content={post.updatedAt} />
        )}
        <meta property="article:author" content={post.author.name} />
        <meta property="article:section" content={post.category} />
        {post.tags.map(tag => (
          <meta key={tag} property="article:tag" content={tag} />
        ))}
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={post.title} />
        <meta name="twitter:description" content={post.excerpt} />
        {post.seo.ogImage && (
          <meta name="twitter:image" content={`https://forward-focus-elevation.org${post.seo.ogImage}`} />
        )}
        
        {/* Structured Data - Article */}
        <script type="application/ld+json">
          {JSON.stringify(articleSchema)}
        </script>
        
        {/* Structured Data - Organization */}
        <script type="application/ld+json">
          {JSON.stringify(generateOrganizationSchema())}
        </script>
        
        {/* Structured Data - Breadcrumb */}
        <script type="application/ld+json">
          {JSON.stringify(breadcrumbSchema)}
        </script>
        
        {/* Structured Data - FAQ if exists */}
        {faqs.length > 0 && (
          <script type="application/ld+json">
            {JSON.stringify(generateFAQSchema(faqs))}
          </script>
        )}
        
        {/* Reading time meta */}
        <meta name="twitter:label1" content="Reading time" />
        <meta name="twitter:data1" content={`${post.readingTime} minutes`} />
      </Helmet>

      <div className="min-h-screen bg-[#0a1628]">
        {/* Breadcrumb Navigation */}
        <nav className="py-4 border-b border-white/5" aria-label="Breadcrumb">
          <div className="container-custom">
            <ol className="flex items-center gap-2 text-sm text-[#e8e4dc]/60">
              <li>
                <Link to="/" className="hover:text-[#bf8c4e] transition-colors">Home</Link>
              </li>
              <li>/</li>
              <li>
                <Link to="/blog" className="hover:text-[#bf8c4e] transition-colors">Blog</Link>
              </li>
              <li>/</li>
              <li className="text-[#e8e4dc] truncate max-w-[200px]" aria-current="page">
                {post.title}
              </li>
            </ol>
          </div>
        </nav>

        {/* Article Header */}
        <header className="pt-12 pb-8">
          <div className="container-custom max-w-4xl">
            <div className="flex items-center gap-3 mb-6">
              <span className="px-3 py-1 bg-[#bf8c4e]/20 text-[#bf8c4e] text-sm font-medium rounded-full">
                {post.category}
              </span>
              <span className="flex items-center gap-1 text-[#e8e4dc]/60 text-sm">
                <Clock className="h-4 w-4" />
                {post.readingTime} min read
              </span>
            </div>
            
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#f0e6d2] mb-6 font-display leading-tight">
              {post.title}
            </h1>
            
            <p className="text-lg md:text-xl text-[#e8e4dc]/80 mb-8 leading-relaxed">
              {post.excerpt}
            </p>
            
            <div className="flex flex-wrap items-center justify-between gap-4 py-6 border-y border-white/10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#bf8c4e]/20 flex items-center justify-center">
                  <User className="h-6 w-6 text-[#bf8c4e]" />
                </div>
                <div>
                  <div className="font-medium text-[#f0e6d2]">{post.author.name}</div>
                  <div className="text-sm text-[#e8e4dc]/60">{post.author.title}</div>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <time className="flex items-center gap-2 text-[#e8e4dc]/60 text-sm">
                  <Calendar className="h-4 w-4" />
                  {new Date(post.publishedAt).toLocaleDateString('en-US', { 
                    year: 'numeric',
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </time>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShare}
                  className="border-white/20 text-[#e8e4dc] hover:bg-white/5"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Article Content */}
        <article className="py-8">
          <div className="container-custom max-w-4xl">
            <div className="prose prose-invert prose-lg max-w-none prose-headings:text-[#f0e6d2] prose-headings:font-display prose-p:text-[#e8e4dc]/90 prose-a:text-[#bf8c4e] prose-a:no-underline hover:prose-a:underline prose-strong:text-[#f0e6d2] prose-li:text-[#e8e4dc]/90 prose-blockquote:border-[#bf8c4e] prose-blockquote:bg-[#bf8c4e]/5 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:rounded-r-lg">
              <ReactMarkdown>{post.content}</ReactMarkdown>
            </div>
            
            {/* Tags */}
            <div className="mt-12 pt-8 border-t border-white/10">
              <h3 className="text-sm font-medium text-[#e8e4dc]/60 mb-4">Topics Covered</h3>
              <div className="flex flex-wrap gap-2">
                {post.tags.map(tag => (
                  <Link
                    key={tag}
                    to={`/blog?tag=${encodeURIComponent(tag)}`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-white/5 text-[#e8e4dc]/80 text-sm rounded-full hover:bg-white/10 hover:text-[#bf8c4e] transition-all"
                  >
                    <Tag className="h-3 w-3" />
                    {tag}
                  </Link>
                ))}
              </div>
            </div>
            
            {/* Author Bio */}
            <div className="mt-12 p-6 bg-white/5 rounded-xl border border-white/10">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-full bg-[#bf8c4e]/20 flex items-center justify-center flex-shrink-0">
                  <User className="h-8 w-8 text-[#bf8c4e]" />
                </div>
                <div>
                  <h3 className="font-semibold text-[#f0e6d2] mb-1">
                    About {post.author.name}
                  </h3>
                  <p className="text-sm text-[#bf8c4e] mb-2">{post.author.title}</p>
                  <p className="text-[#e8e4dc]/70 text-sm leading-relaxed">
                    {post.author.bio}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </article>

        {/* Related Articles */}
        {relatedPosts.length > 0 && (
          <section className="py-16 border-t border-white/10">
            <div className="container-custom max-w-4xl">
              <h2 className="text-2xl font-bold text-[#f0e6d2] mb-8 font-display">Related Articles</h2>
              <div className="grid md:grid-cols-2 gap-6">
                {relatedPosts.map(relatedPost => (
                  <article 
                    key={relatedPost.id}
                    className="group bg-white/5 rounded-xl overflow-hidden border border-white/10 hover:border-[#bf8c4e]/50 transition-all"
                  >
                    <Link to={`/blog/${relatedPost.slug}`} className="block p-6">
                      <span className="inline-block px-3 py-1 bg-[#bf8c4e]/20 text-[#bf8c4e] text-xs font-medium rounded-full mb-3">
                        {relatedPost.category}
                      </span>
                      <h3 className="font-bold text-[#f0e6d2] mb-2 group-hover:text-[#bf8c4e] transition-colors">
                        {relatedPost.title}
                      </h3>
                      <p className="text-[#e8e4dc]/70 text-sm line-clamp-2">
                        {relatedPost.excerpt}
                      </p>
                    </Link>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Back to Blog */}
        <section className="py-8">
          <div className="container-custom max-w-4xl">
            <Button
              variant="outline"
              asChild
              className="border-white/20 text-[#e8e4dc] hover:bg-white/5"
            >
              <Link to="/blog">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to All Articles
              </Link>
            </Button>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16">
          <div className="container-custom max-w-4xl">
            <div className="bg-gradient-to-r from-[#1a3a5c] to-[#0f172a] rounded-2xl p-8 md:p-12 text-center">
              <h2 className="text-2xl font-bold text-[#f0e6d2] mb-4 font-display">
                Ready to Take the Next Step?
              </h2>
              <p className="text-[#e8e4dc]/80 max-w-2xl mx-auto mb-8">
                Coach Kay is here to help you find personalized resources for your situation across Ohio's 88 counties.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  asChild
                  className="bg-[#bf8c4e] hover:bg-[#bf8c4e]/90 text-[#0a1628] px-8 py-6 text-base font-semibold"
                >
                  <Link to="/discover">Find Resources</Link>
                </Button>
                <Button 
                  asChild
                  variant="outline"
                  className="border-[#bf8c4e] text-[#bf8c4e] hover:bg-[#bf8c4e]/10 px-8 py-6 text-base"
                >
                  <Link to="/support">Get Help Now</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
