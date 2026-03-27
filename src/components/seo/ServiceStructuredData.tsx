import { StructuredData } from './StructuredData';
import { SITE_CONFIG } from '@/config/site';

export const ServiceStructuredData = () => {
  const baseUrl = SITE_CONFIG.baseUrl;

  const services = [
    {
      '@type': 'Service',
      name: 'The Collective',
      description: 'Peer support community for justice-impacted individuals and families to connect, share, and grow together.',
      provider: { '@type': 'Organization', '@id': `${baseUrl}/#organization` },
      serviceType: 'Peer Support Community',
      url: `${baseUrl}/learn`,
    },
    {
      '@type': 'Service',
      name: 'Healing Hub',
      description: 'Trauma-informed digital wellness tools including guided breathing, somatic release, journaling, and frequency healing.',
      provider: { '@type': 'Organization', '@id': `${baseUrl}/#organization` },
      serviceType: 'Trauma-Informed Wellness Tools',
      url: `${baseUrl}/victim-services`,
    },
    {
      '@type': 'Service',
      name: 'Individual Coaching',
      description: 'One-on-one life transformation coaching sessions with Coach Kay, focusing on reentry planning, goal setting, and personal development.',
      provider: { '@type': 'Person', '@id': `${baseUrl}/#person-coach-kay` },
      serviceType: '1:1 Life Transformation Coaching',
      url: `${baseUrl}/support`,
    },
    {
      '@type': 'Service',
      name: 'Reentry Navigator',
      description: 'AI-powered reentry planning assistant helping justice-impacted individuals find housing, employment, legal aid, and community resources.',
      provider: { '@type': 'Organization', '@id': `${baseUrl}/#organization` },
      serviceType: 'Reentry Planning Assistant',
      url: `${baseUrl}/help`,
    },
    {
      '@type': 'Service',
      name: 'Youth Futures',
      description: 'Career exploration, AI literacy, and education support program for justice-impacted youth ages 14-26.',
      provider: { '@type': 'Organization', '@id': `${baseUrl}/#organization` },
      serviceType: 'Youth Career and Education Support',
      url: `${baseUrl}/youth-futures`,
    },
    {
      '@type': 'Service',
      name: 'Victim Support',
      description: 'Comprehensive crime victim resources including crisis intervention, advocacy, legal aid referrals, and trauma recovery tools.',
      provider: { '@type': 'Organization', '@id': `${baseUrl}/#organization` },
      serviceType: 'Crime Victim Resources',
      url: `${baseUrl}/victim-services`,
    },
  ];

  return (
    <StructuredData
      data={{
        '@context': 'https://schema.org',
        '@graph': services,
      }}
    />
  );
};
