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
import remarkGfm from "remark-gfm";

const markdownComponents = {
  h2: (props: any) => (
    <h2 className="mt-12 mb-4 text-3xl font-semibold font-display tracking-tight text-foreground" {...props} />
  ),
  h3: (props: any) => (
    <h3 className="mt-8 mb-3 text-2xl font-semibold text-foreground" {...props} />
  ),
  h4: (props: any) => (
    <h4 className="mt-6 mb-2 text-xl font-semibold text-foreground" {...props} />
  ),
  p: (props: any) => (
    <p className="mb-5 text-lg leading-8 text-foreground/85" {...props} />
  ),
  ul: (props: any) => (
    <ul className="mb-6 ml-6 list-disc space-y-3 text-lg leading-8 text-foreground/85 marker:text-osu-scarlet" {...props} />
  ),
  ol: (props: any) => (
    <ol className="mb-6 ml-6 list-decimal space-y-3 text-lg leading-8 text-foreground/85 marker:font-semibold marker:text-osu-scarlet" {...props} />
  ),
  li: (props: any) => <li className="pl-1" {...props} />,
  a: (props: any) => (
    <a className="font-medium text-osu-scarlet underline decoration-osu-scarlet/30 underline-offset-4 transition-colors hover:text-osu-scarlet/80" {...props} />
  ),
  strong: (props: any) => <strong className="font-semibold text-foreground" {...props} />,
  blockquote: (props: any) => (
    <blockquote className="my-8 rounded-r-xl border-l-4 border-osu-scarlet bg-osu-scarlet/5 px-5 py-4 text-foreground/85" {...props} />
  ),
  hr: (props: any) => <hr className="my-10 border-foreground/10" {...props} />,
  table: (props: any) => (
    <div className="my-8 overflow-x-auto rounded-xl border border-foreground/10 bg-white shadow-sm">
      <table className="w-full min-w-[560px] border-collapse text-left text-base" {...props} />
    </div>
  ),
  thead: (props: any) => <thead className="bg-foreground/5" {...props} />,
  th: (props: any) => (
    <th className="border-b border-foreground/10 px-4 py-3 text-sm font-semibold uppercase tracking-[0.08em] text-foreground" {...props} />
  ),
  td: (props: any) => <td className="border-b border-foreground/10 px-4 py-3 align-top text-foreground/80" {...props} />,
  code: ({ inline, className, children, ...props }: any) =>
    inline ? (
      <code className={`rounded bg-foreground/5 px-1.5 py-0.5 font-mono text-[0.95em] text-foreground ${className ?? ""}`.trim()} {...props}>
        {children}
      </code>
    ) : (
      <code className="block overflow-x-auto rounded-xl bg-foreground px-4 py-4 font-mono text-sm text-white" {...props}>
        {children}
      </code>
    ),
};

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
    { name: "Knowledge Hub", url: "/blog" },
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

      <div className="min-h-screen bg-white">
        <div className="absolute inset-x-0 top-0 h-[32rem] bg-gradient-to-b from-osu-scarlet/6 via-transparent to-transparent pointer-events-none" />
        {/* Breadcrumb Navigation */}
        <nav className="py-4 border-b border-foreground/8" aria-label="Breadcrumb">
          <div className="container-custom max-w-5xl mx-auto">
            <ol className="flex items-center gap-2 text-sm text-foreground/60">
              <li>
                <Link to="/" className="hover:text-osu-scarlet transition-colors">Home</Link>
              </li>
              <li>/</li>
              <li>
                <Link to="/blog" className="hover:text-osu-scarlet transition-colors">Knowledge Hub</Link>
              </li>
              <li>/</li>
              <li className="text-foreground truncate max-w-[200px]" aria-current="page">
                {post.title}
              </li>
            </ol>
          </div>
        </nav>

        {/* Article Header */}
        <header className="pt-12 pb-10">
          <div className="container-custom max-w-5xl mx-auto">
            <div className="mx-auto max-w-4xl text-center">
              <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
                <span className="px-3 py-1 bg-osu-scarlet/20 text-osu-scarlet text-sm font-medium rounded-full">
                  {post.category}
                </span>
                <span className="flex items-center gap-1 text-foreground/60 text-sm">
                  <Clock className="h-4 w-4" />
                  {post.readingTime} min read
                </span>
              </div>

              <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 font-display leading-[1.08] tracking-tight text-balance">
                {post.title}
              </h1>

              <p className="text-lg md:text-xl text-foreground/80 mb-10 leading-relaxed max-w-3xl mx-auto text-balance">
                {post.excerpt}
              </p>

              <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-foreground/10 bg-white/90 px-6 py-5 shadow-sm backdrop-blur-sm text-left">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-osu-scarlet/20 flex items-center justify-center">
                    <User className="h-6 w-6 text-osu-scarlet" />
                  </div>
                  <div>
                    <div className="font-medium text-foreground">{post.author.name}</div>
                    <div className="text-sm text-foreground/60">{post.author.title}</div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <time className="flex items-center gap-2 text-foreground/60 text-sm">
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
                    className="border-foreground/20 bg-white text-foreground hover:bg-foreground/5"
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Article Content */}
        <article className="py-4 md:py-8">
          <div className="container-custom max-w-5xl mx-auto">
            <div className="mx-auto max-w-4xl rounded-[2rem] border border-foreground/10 bg-white px-6 py-8 shadow-[0_18px_55px_-32px_rgba(15,23,42,0.3)] md:px-10 md:py-12">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {post.content}
              </ReactMarkdown>
            </div>

            {/* Tags */}
            <div className="mx-auto mt-12 max-w-4xl pt-8 border-t border-foreground/10">
              <h3 className="text-sm font-medium text-foreground/60 mb-4 text-center">Topics Covered</h3>
              <div className="flex flex-wrap justify-center gap-2">
                {post.tags.map(tag => (
                  <Link
                    key={tag}
                    to={`/blog?tag=${encodeURIComponent(tag)}`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-foreground/5 text-foreground/80 text-sm rounded-full hover:bg-white/10 hover:text-osu-scarlet transition-all"
                  >
                    <Tag className="h-3 w-3" />
                    {tag}
                  </Link>
                ))}
              </div>
            </div>

            {/* Author Bio */}
            <div className="mx-auto mt-12 max-w-4xl p-6 bg-foreground/5 rounded-2xl border border-foreground/10 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-full bg-osu-scarlet/20 flex items-center justify-center flex-shrink-0">
                  <User className="h-8 w-8 text-osu-scarlet" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">
                    About {post.author.name}
                  </h3>
                  <p className="text-sm text-osu-scarlet mb-2">{post.author.title}</p>
                  <p className="text-foreground/70 text-sm leading-relaxed">
                    {post.author.bio}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </article>

        {/* Related Articles */}
        {relatedPosts.length > 0 && (
          <section className="py-16 border-t border-foreground/10">
            <div className="container-custom max-w-5xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-8 font-display text-center">Related Articles</h2>
              <div className="grid md:grid-cols-2 gap-6">
                {relatedPosts.map(relatedPost => (
                  <article
                    key={relatedPost.id}
                    className="group bg-foreground/5 rounded-xl overflow-hidden border border-foreground/10 hover:border-osu-scarlet/50 transition-all"
                  >
                    <Link to={`/blog/${relatedPost.slug}`} className="block p-6">
                      <span className="inline-block px-3 py-1 bg-osu-scarlet/20 text-osu-scarlet text-xs font-medium rounded-full mb-3">
                        {relatedPost.category}
                      </span>
                      <h3 className="font-bold text-foreground mb-2 group-hover:text-osu-scarlet transition-colors">
                        {relatedPost.title}
                      </h3>
                      <p className="text-foreground/70 text-sm line-clamp-2">
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
          <div className="container-custom max-w-5xl mx-auto flex justify-center">
            <Button
              variant="outline"
              asChild
              className="border-foreground/20 text-foreground hover:bg-foreground/5"
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
          <div className="container-custom max-w-5xl mx-auto">
            <div className="bg-gradient-to-r from-foreground/5 to-foreground/10 rounded-2xl p-8 md:p-12 text-center">
              <h2 className="text-2xl font-bold text-foreground mb-4 font-display">
                Ready to Take the Next Step?
              </h2>
              <p className="text-foreground/80 max-w-2xl mx-auto mb-8">
                Coach Kay is here to help you find personalized resources for your situation across Ohio's 88 counties.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  asChild
                  className="bg-osu-scarlet hover:bg-osu-scarlet/90 text-[#0a1628] px-8 py-6 text-base font-semibold"
                >
                  <Link to="/discover">Find Resources</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="border-osu-scarlet text-osu-scarlet hover:bg-osu-scarlet/10 px-8 py-6 text-base"
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

