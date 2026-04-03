import { useEffect } from 'react';

interface AntiWhiteLabelConfig {
  allowedDomains: string[];
  brandName: string;
  copyrightNotice: string;
}

const config: AntiWhiteLabelConfig = {
  allowedDomains: [
    'localhost',
    '127.0.0.1',
    'forward-focus-elevation.org',
    'www.forward-focus-elevation.org',
    'peckmhkxhgkgopmjthmp.supabase.co',
    'github.io',
    'netlify.app',
    'vercel.app',
    'lovable.app',
    'lovableproject.com',
  ],
  brandName: 'Forward Focus Elevation',
  copyrightNotice: '© 2025 Forward Focus Elevation. All rights reserved. Unauthorized use prohibited.'
};

export const AntiWhiteLabelProtection = () => {
  useEffect(() => {
    const currentDomain = window.location.hostname;
    const isAllowedDomain = config.allowedDomains.some(domain =>
      currentDomain === domain ||
      currentDomain.endsWith('.' + domain)
    );

    if (!isAllowedDomain) {
      // Log only — do not block page rendering
      console.warn(`[FFE] Domain not in allowlist: ${currentDomain}`);
    }

    // Watermark removed per user request

  }, []);

  return null;
};