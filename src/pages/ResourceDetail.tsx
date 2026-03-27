import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StructuredData } from "@/components/seo/StructuredData";
import { BreadcrumbSchema } from "@/components/seo/BreadcrumbSchema";
import { SEOHead } from "@/components/seo/SEOHead";
import { SITE_CONFIG } from "@/config/site";

const ResourceDetail = () => {
  const { id } = useParams();
  const [resource, setResource] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResource = async () => {
      if (!id) return;
      
      const { data } = await supabase
        .from('resources')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      
      setResource(data);
      setLoading(false);
    };
    
    fetchResource();
  }, [id]);
  useEffect(() => { 
    document.title = resource ? `${resource.name} | Resource` : 'Resource'; 
  }, [resource]);

  if (loading) {
    return (
      <main id="main" className="container py-16">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="font-heading text-4xl font-bold mb-4">Loading...</h1>
        </div>
      </main>
    );
  }

  if (!resource) {
    return (
      <main id="main" className="container py-16">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="font-heading text-4xl font-bold mb-4">Resource not found</h1>
          <p className="text-xl text-foreground/80 mb-8">It may have been updated or removed.</p>
          <Button asChild size="lg" className="shadow-md">
            <a href="/search">Browse All Resources</a>
          </Button>
        </div>
      </main>
    );
  }

  return (
    <>
      <SEOHead
        title={resource.name}
        description={resource.description || `${resource.name} - Resource details`}
        path={`/resource/${id}`}
      />
      <StructuredData data={{
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: resource.name,
        description: resource.description || '',
        url: `${SITE_CONFIG.baseUrl}/resource/${id}`,
        datePublished: resource.created_at,
        dateModified: resource.updated_at || resource.created_at,
        author: { '@type': 'Person', '@id': `${SITE_CONFIG.baseUrl}/#person-coach-kay` },
        publisher: { '@type': 'Organization', '@id': `${SITE_CONFIG.baseUrl}/#organization` },
        mainEntityOfPage: { '@type': 'WebPage', '@id': `${SITE_CONFIG.baseUrl}/resource/${id}` },
      }} />
      <BreadcrumbSchema crumbs={[
        { name: 'Search', path: '/search' },
        { name: resource.name, path: `/resource/${id}` },
      ]} />
    <main id="main" className="container py-16">
      <div className="max-w-4xl mx-auto">
        <header className="mb-10">
          <h1 className="font-heading text-5xl font-bold mb-4">{resource.name}</h1>
          <p className="text-xl text-foreground/80">{resource.organization} • {resource.city}</p>
        </header>
        <Card className="shadow-lg border-0">
          <CardContent className="p-12">
            <p className="text-lg leading-relaxed">{resource.description}</p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
};
export default ResourceDetail;
