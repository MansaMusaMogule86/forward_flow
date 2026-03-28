/**
 * Centralized site configuration
 * Single source of truth for all domain and site-related settings
 */

const IS_PRODUCTION = true;

// Domain configurations
const DOMAINS = {
  preview: 'localhost',
  production: 'forward-focus-elevation.org',
} as const;

// Get the active domain based on environment
const getActiveDomain = () => {
  // In browser, we can detect the actual domain
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    // If running on localhost, use the configured default
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return IS_PRODUCTION ? DOMAINS.production : DOMAINS.preview;
    }
    // Otherwise use the actual hostname
    return hostname;
  }
  // Server-side or build time: use the configured default
  return IS_PRODUCTION ? DOMAINS.production : DOMAINS.preview;
};

export const SITE_CONFIG = {
  // Domain settings
  domains: DOMAINS,
  isProduction: IS_PRODUCTION,
  
  // Get the current active domain
  get domain() {
    return getActiveDomain();
  },
  
  // Get the full base URL with protocol
  get baseUrl() {
    return `https://${this.domain}`;
  },
  
  // Site identity
  name: 'Forward Focus Elevation',
  shortName: 'FFE',
  tagline: 'Empowering Justice-Impacted Families',
  description: 'Empowering justice-impacted families with the tools to rebuild and thrive. Launching in Ohio with AI-powered support.',

  // Brand Service Names
  services: {
    collective: 'The Collective',
    skool: 'Focus Flow Elevation Hub',
    healing: 'Healing Hub',
  },
  
  // Social media
  social: {
    twitter: '@FFEServices',
    twitterCreator: '@CoachKayElevates',
    sameAs: [
      'https://www.linkedin.com/company/forward-focus-elevation',
      'https://www.facebook.com/forwardfocuselevation',
      'https://www.instagram.com/forwardfocuselevation',
      'https://x.com/FFEServices'
    ],
  },
  
  // Logo paths (relative to public folder)
  logo: {
    default: '/apple-touch-icon.png',
    transparent: '/apple-touch-icon.png',
  },
  
  // Copyright and legal
  copyright: `© ${new Date().getFullYear()} Forward Focus Elevation. All rights reserved.`,
  
  // Allowed domains for anti-whitelabel protection
  allowedDomains: [
    'localhost',
    '127.0.0.1',
    'forward-focus-elevation.org',
    'www.forward-focus-elevation.org',
  ],
} as const;

// Helper function to get full URL for a path
export const getSiteUrl = (path: string = '') => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${SITE_CONFIG.baseUrl}${cleanPath}`;
};

// Helper function to get full image URL
export const getImageUrl = (imagePath: string) => {
  const cleanPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
  return `${SITE_CONFIG.baseUrl}${cleanPath}`;
};

// Export individual constants for convenience
export const SITE_NAME = SITE_CONFIG.name;
export const SITE_DOMAIN = SITE_CONFIG.domain;
export const SITE_BASE_URL = SITE_CONFIG.baseUrl;
