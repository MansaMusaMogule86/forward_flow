import { StructuredData } from './StructuredData';
import { SITE_CONFIG } from '@/config/site';

interface Crumb {
  name: string;
  path: string;
}

interface BreadcrumbSchemaProps {
  crumbs: Crumb[];
}

export const BreadcrumbSchema = ({ crumbs }: BreadcrumbSchemaProps) => {
  const baseUrl = SITE_CONFIG.baseUrl;

  const itemListElement = [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Home',
      item: baseUrl,
    },
    ...crumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 2,
      name: crumb.name,
      item: `${baseUrl}${crumb.path}`,
    })),
  ];

  return (
    <StructuredData
      data={{
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement,
      }}
    />
  );
};
