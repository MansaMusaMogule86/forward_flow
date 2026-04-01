/**
 * SEO Schema Generator
 * Creates comprehensive JSON-LD structured data for maximum search visibility
 */

import type { BlogPost, BlogAuthor } from "@/data/blog/posts";

// Organization Schema
export function generateOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Forward Focus Elevation",
    "alternateName": "The Collective | Healing Hub",
    "url": "https://forwardfocuselevation.org",
    "logo": {
      "@type": "ImageObject",
      "url": "https://forwardfocuselevation.org/logo-primary.jpg",
      "width": 1200,
      "height": 630
    },
    "image": {
      "@type": "ImageObject",
      "url": "https://forwardfocuselevation.org/og-image.jpg",
      "width": 1200,
      "height": 630,
      "caption": "Forward Focus Elevation - CEO Logo"
    },
    "description": "Ohio's AI-powered hub for second chances. We provide holistic support including housing, employment, legal aid, and trauma-informed victim services across all 88 counties.",
    "founder": {
      "@type": "Person",
      "name": "Coach Kay"
    },
    "foundingDate": "2024",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Columbus",
      "addressRegion": "OH",
      "addressCountry": "US"
    },
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "Customer Support",
      "areaServed": "OH",
      "availableLanguage": ["English"]
    },
    "sameAs": [
      "https://www.skool.com/focusflowelevation",
      "https://www.calendly.com/ffe_coach_kay"
    ],
    "hasOfferCatalog": {
      "@type": "OfferCatalog",
      "name": "Services",
      "itemListElement": [
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "AI Resource Navigation",
            "description": "AI-powered resource discovery for housing, employment, and legal aid"
          }
        },
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "Victim Services",
            "description": "Trauma-informed support for crime survivors across Ohio"
          }
        },
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "Reentry Support",
            "description": "Comprehensive reentry services for justice-impacted individuals"
          }
        }
      ]
    }
  };
}

// Website Schema
export function generateWebsiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "Forward Focus Elevation",
    "url": "https://forwardfocuselevation.org",
    "description": "Ohio's AI-powered hub for second chances, victim services, and life transformation",
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": "https://forwardfocuselevation.org/search?q={search_term_string}"
      },
      "query-input": "required name=search_term_string"
    }
  };
}

// Blog Schema
export function generateBlogSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Blog",
    "name": "Forward Focus Elevation Blog",
    "description": "Resources and insights for reentry success, victim support, and life transformation in Ohio",
    "url": "https://forwardfocuselevation.org/blog",
    "publisher": {
      "@type": "Organization",
      "name": "Forward Focus Elevation",
      "logo": {
        "@type": "ImageObject",
        "url": "https://forwardfocuselevation.org/logo-primary.jpg"
      }
    }
  };
}

// Article/BlogPosting Schema
export function generateArticleSchema(post: BlogPost, url: string) {
  const schema: any = {
    "@context": "https://schema.org",
    "@type": post.schema.articleType || "Article",
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": url
    },
    "headline": post.title,
    "description": post.excerpt,
    "image": post.featuredImage || post.seo.ogImage 
      ? `https://forwardfocuselevation.org${post.featuredImage || post.seo.ogImage}`
      : undefined,
    "author": {
      "@type": "Person",
      "name": post.author.name,
      "jobTitle": post.author.title,
      "description": post.author.bio
    },
    "publisher": {
      "@type": "Organization",
      "name": "Forward Focus Elevation",
      "logo": {
        "@type": "ImageObject",
        "url": "https://forwardfocuselevation.org/logo-primary.jpg",
        "width": 512,
        "height": 512
      }
    },
    "datePublished": post.publishedAt,
    "dateModified": post.updatedAt || post.publishedAt,
    "articleSection": post.category,
    "keywords": post.tags.join(", "),
    "wordCount": post.content.split(/\s+/).length,
    "timeRequired": `PT${post.readingTime}M`
  };

  // Remove undefined values
  Object.keys(schema).forEach(key => {
    if (schema[key] === undefined) {
      delete schema[key];
    }
  });

  return schema;
}

// Breadcrumb Schema
export function generateBreadcrumbSchema(items: Array<{ name: string; url: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": `https://forwardfocuselevation.org${item.url}`
    }))
  };
}

// FAQ Schema
export function generateFAQSchema(faqs: Array<{ question: string; answer: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };
}

// LocalBusiness Schema for Ohio Service Areas
export function generateLocalBusinessSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "NGO",
    "name": "Forward Focus Elevation",
    "alternateName": "The Collective at Forward Focus Elevation",
    "description": "Nonprofit organization providing AI-powered resource navigation, victim services, and reentry support across Ohio's 88 counties",
    "url": "https://forwardfocuselevation.org",
    "areaServed": {
      "@type": "State",
      "name": "Ohio",
      "containedInPlace": {
        "@type": "Country",
        "name": "United States"
      }
    },
    "serviceArea": {
      "@type": "GeoCircle",
      "geoMidpoint": {
        "@type": "GeoCoordinates",
        "latitude": 40.4173,
        "longitude": -82.9071
      },
      "geoRadius": "300 miles"
    },
    "services": [
      "Crisis Support",
      "Housing Assistance",
      "Employment Services",
      "Legal Aid Navigation",
      "Victim Services",
      "Mental Health Resources",
      "Reentry Support"
    ],
    "knowsAbout": [
      "Second Chance Employment",
      "Expungement in Ohio",
      "Victim Compensation",
      "Trauma-Informed Care",
      "Reentry Services",
      "Housing for Justice-Impacted Individuals"
    ]
  };
}

// HowTo Schema (for guides)
export function generateHowToSchema(
  title: string,
  description: string,
  steps: Array<{ name: string; text: string; url?: string }>,
  totalTime?: string
) {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": title,
    "description": description,
    "totalTime": totalTime,
    "step": steps.map((step, index) => ({
      "@type": "HowToStep",
      "position": index + 1,
      "name": step.name,
      "text": step.text,
      "url": step.url
    }))
  };
}

// Service Schema
export function generateServiceSchema(
  name: string,
  description: string,
  provider: string = "Forward Focus Elevation",
  areaServed: string = "Ohio"
) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": name,
    "description": description,
    "provider": {
      "@type": "Organization",
      "name": provider
    },
    "areaServed": {
      "@type": "State",
      "name": areaServed
    }
  };
}

// Aggregate all schemas for a page
export function combineSchemas(...schemas: any[]) {
  return schemas.map(schema => JSON.stringify(schema));
}

// Helper to inject schema into page
export function injectSchema(schemas: string | string[]) {
  const schemaArray = Array.isArray(schemas) ? schemas : [schemas];
  return schemaArray.map(schema => `
    <script type="application/ld+json">
      ${schema}
    </script>
  `).join('\n');
}
