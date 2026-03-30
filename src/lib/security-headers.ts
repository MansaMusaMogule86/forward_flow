// Enhanced security headers and configuration for the application
export const setupSecurityHeaders = () => {
  // Enhanced Content Security Policy
  const isProd = import.meta.env.PROD;

  // Enhanced CSP - tightened for production
  const scriptSrc = [
    "'self'",
    // unsafe-inline and unsafe-eval are only needed in dev (Vite HMR)
    ...(!isProd ? ["'unsafe-inline'", "'unsafe-eval'"] : []),
    'https://js.stripe.com',
    'https://assets.calendly.com',
  ].join(' ');

  // unsafe-inline is retained in both environments because the app uses
  // inline styles throughout (Tailwind, component style props, etc.).
  // Removing it in production would silently break rendering.
  const styleSrc = [
    "'self'",
    "'unsafe-inline'",
    'https://fonts.googleapis.com',
    'https://assets.calendly.com',
  ].join(' ');

  const csp = [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    `style-src ${styleSrc}`,
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https: https://*.supabase.co",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://assets.calendly.com",
    "frame-src https://calendly.com https://js.stripe.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests"
  ].join('; ');

  // Enhanced security headers (relaxed CORS for Supabase connectivity)
  const securityHeaders = [
    { name: 'Content-Security-Policy', content: csp },
    { name: 'X-Content-Type-Options', content: 'nosniff' },
    { name: 'X-Frame-Options', content: 'DENY' },
    { name: 'X-XSS-Protection', content: '1; mode=block' },
    { name: 'Referrer-Policy', content: 'strict-origin-when-cross-origin' },
    { name: 'Permissions-Policy', content: 'camera=(), microphone=(), location=(), payment=(), geolocation=()' },
    { name: 'Strict-Transport-Security', content: 'max-age=31536000; includeSubDomains; preload' },
    { name: 'X-Permitted-Cross-Domain-Policies', content: 'none' },
    { name: 'Cross-Origin-Opener-Policy', content: 'same-origin' }
    // Removed Cross-Origin-Embedder-Policy and Cross-Origin-Resource-Policy to allow Supabase connections
  ];

  // Add security-related meta tags if they don't exist
  const addMetaTag = (name: string, content: string) => {
    if (!document.querySelector(`meta[name="${name}"]`) && !document.querySelector(`meta[http-equiv="${name}"]`)) {
      const meta = document.createElement('meta');
      meta.name = name;
      meta.content = content;
      document.head.appendChild(meta);
    }
  };

  // Apply all security headers
  securityHeaders.forEach(header => {
    addMetaTag(header.name, header.content);
  });

  // Additional security measures
  setupAdditionalSecurity();
};

// Additional security setup
const setupAdditionalSecurity = () => {
  // Disable text selection for sensitive content
  const sensitiveSelectors = ['.contact-info', '.admin-panel', '.sensitive-data'];
  sensitiveSelectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    elements.forEach(element => {
      (element as HTMLElement).style.userSelect = 'none';
      (element as HTMLElement).style.webkitUserSelect = 'none';
    });
  });

  // Clear sensitive data from memory on page unload
  window.addEventListener('beforeunload', () => {
    // Clear localStorage of sensitive data (keep user preferences)
    const sensitiveKeys = ['contact-data', 'admin-cache', 'temp-data'];
    sensitiveKeys.forEach(key => {
      localStorage.removeItem(key);
    });
    
    // Clear sessionStorage completely
    sessionStorage.clear();
  });
};

// Security configuration object
export const securityConfig = {
  // Rate limiting settings
  rateLimit: {
    contact: { maxAttempts: 3, windowMs: 300000 }, // 3 attempts per 5 minutes
    referral: { maxAttempts: 2, windowMs: 600000 }, // 2 attempts per 10 minutes
    partnership: { maxAttempts: 2, windowMs: 600000 }, // 2 attempts per 10 minutes
    admin: { maxAttempts: 50, windowMs: 3600000 } // 50 attempts per hour
  },
  
  // Input validation settings
  validation: {
    name: { minLength: 2, maxLength: 100 },
    email: { maxLength: 254 },
    phone: { minLength: 10, maxLength: 15 },
    message: { minLength: 10, maxLength: 1000 },
    notes: { minLength: 10, maxLength: 500 },
    description: { minLength: 10, maxLength: 1000 }
  },
  
  // CSRF token settings
  csrf: {
    tokenLength: 32,
    headerName: 'X-CSRF-Token'
  }
};

// Audit logging helper
export const auditLog = {
  actions: {
    FORM_SUBMIT: 'FORM_SUBMIT',
    CONTACT_VIEW: 'CONTACT_VIEW',
    STATUS_UPDATE: 'STATUS_UPDATE',
    ADMIN_ACCESS: 'ADMIN_ACCESS',
    RATE_LIMIT_HIT: 'RATE_LIMIT_HIT'
  },
  
  // Log security events (client-side logging for debugging)
  log: (action: string, details: Record<string, any> = {}) => {
    if (import.meta.env.DEV) {
      console.log(`[SECURITY AUDIT] ${action}:`, details);
    }
  }
};