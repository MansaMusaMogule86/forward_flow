// Anti-Whitelabeling Protection System
// Prevents unauthorized copying and hosting of the platform
import { SUPPORT_EMAIL } from '@/config/contact';

interface DomainConfig {
  allowedDomains: string[];
  brandName: string;
  copyrightNotice: string;
}

const AUTHORIZED_CONFIG: DomainConfig = {
  allowedDomains: [
    'localhost',
    '127.0.0.1',
    'forward-focus-elevation.org',
    'www.forward-focus-elevation.org',
    'mdwkkgancoocvkmecwkm.supabase.co',
    'github.io',
    'netlify.app',
    'vercel.app',
    'lovable.app',
    'lovableproject.com',
  ],
  brandName: 'Forward Focus Elevation',
  copyrightNotice: '© 2025 Forward Focus Elevation. All rights reserved.'
};

class AntiWhitelabelProtection {
  private isAuthorized = false;
  private domainChecked = false;
  
  constructor() {
    this.init();
  }

  private init() {
    // Immediate domain validation
    this.validateDomain();
    
    // Continuous monitoring
    setInterval(() => this.validateDomain(), 30000); // Check every 30 seconds
    
    // Check for tampering attempts
    this.monitorTampering();
  }

  private validateDomain(): boolean {
    const currentDomain = window.location.hostname;
    const isDevelopment = currentDomain === 'localhost' || currentDomain.includes('127.0.0.1');
    const isAuthorizedDomain = AUTHORIZED_CONFIG.allowedDomains.some(domain => 
      currentDomain.includes(domain) || currentDomain.endsWith(domain)
    );
    
    this.isAuthorized = isDevelopment || isAuthorizedDomain;
    this.domainChecked = true;
    
    if (!this.isAuthorized) {
      this.handleUnauthorizedUsage();
      return false;
    }
    
    return true;
  }

  private handleUnauthorizedUsage() {
    // Log only — do not block page rendering
    console.warn('[FFE] Domain not in allowlist:', window.location.hostname);
  }

  private monitorTampering() {
    // Monitor for attempts to modify the protection system
    const originalConsoleLog = console.log;
    
    console.log = (...args) => {
      if (args.some(arg => typeof arg === 'string' && arg.includes('anti-whitelabel'))) {
        this.handleTamperingAttempt('Console tampering detected');
      }
      originalConsoleLog.apply(console, args);
    };
  }

  private handleTamperingAttempt(reason: string) {
    console.warn('Tampering attempt detected:', reason);
    
    // Log to analytics if available
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'security_violation', {
        violation_type: 'tampering_attempt',
        reason: reason,
        domain: window.location.hostname
      });
    }
  }

  public isAuthenticatedDomain(): boolean {
    return this.domainChecked && this.isAuthorized;
  }

  public getBrandInfo() {
    return {
      name: AUTHORIZED_CONFIG.brandName,
      copyright: AUTHORIZED_CONFIG.copyrightNotice,
      authorized: this.isAuthorized
    };
  }
}

// Initialize protection system immediately
const antiWhitelabelProtection = new AntiWhitelabelProtection();

export { antiWhitelabelProtection, AntiWhitelabelProtection };