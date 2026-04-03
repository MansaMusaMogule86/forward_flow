/**
 * Centralized site configuration for Edge Functions
 * This mirrors the frontend config but is used in server-side code
 */

export const SITE_CONFIG = {
  // Production domain
  domain: "forward-focus-elevation.org",
  
  // Full base URL
  baseUrl: "https://forward-focus-elevation.org",
  
  // Site identity
  name: "Forward Focus Elevation",
  shortName: "FFE",
  
  // Brand Service Names
  services: {
    collective: "The Collective",
    skool: "Focus Flow Elevation Hub",
    healing: "Healing Hub",
  },

  // Logo URL (hosted on Supabase storage)
  logoUrl: "https://mdwkkgancoocvkmecwkm.supabase.co/storage/v1/object/public/assets/logo-new.png",
  
  // Routes
  routes: {
    home: "/",
    search: "/search",
    learn: "/learn",
    help: "/help",
    support: "/support",
    donate: "/support#donate",
    successStories: "/success-stories",
    emailPreferences: "/email-preferences",
    unsubscribe: "/unsubscribe",
  },
} as const;

// Helper to get full URL for a path
export function getSiteUrl(path: string = ""): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_CONFIG.baseUrl}${cleanPath}`;
}

// Helper to build unsubscribe link
export function getUnsubscribeLink(subscriberId: string): string {
  return `${SITE_CONFIG.baseUrl}/unsubscribe?id=${subscriberId}`;
}

// Helper to build preferences link
export function getPreferencesLink(subscriberId: string): string {
  return `${SITE_CONFIG.baseUrl}/email-preferences?id=${subscriberId}`;
}

