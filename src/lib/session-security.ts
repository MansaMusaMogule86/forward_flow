// Enhanced Session Security Manager
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

interface SessionValidationResult {
  isValid: boolean;
  shouldRotate: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  warnings: string[];
}

class SessionSecurityManager {
  private lastActivity: number = Date.now();
  private sessionStartTime: number = Date.now();
  private ipAddress: string | null = null;
  private userAgent: string = navigator.userAgent;
  private rotationInterval: number = 30 * 60 * 1000; // 30 minutes
  
  constructor() {
    this.init();
  }

  private init() {
    // Get IP address for session validation
    this.getClientIP();
    
    // Track user activity
    this.trackActivity();
    
    // Set up session rotation
    this.setupSessionRotation();
    
    // Monitor for session hijacking attempts
    this.monitorSecurity();
  }

  private async getClientIP() {
    try {
      // Use a reliable IP service
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      this.ipAddress = data.ip;
    } catch (error) {
      if (import.meta.env.DEV) {
        logger.warn('Could not get IP address for session validation');
      }
    }
  }

  private trackActivity() {
    const events = ['click', 'keydown', 'mousemove', 'scroll', 'touchstart'];
    
    const updateActivity = () => {
      this.lastActivity = Date.now();
    };
    
    events.forEach(event => {
      document.addEventListener(event, updateActivity, { passive: true });
    });
  }

  private setupSessionRotation() {
    setInterval(() => {
      const timeSinceRotation = Date.now() - this.sessionStartTime;
      
      if (timeSinceRotation > this.rotationInterval) {
        this.rotateSession();
      }
    }, 5 * 60 * 1000); // Check every 5 minutes
  }

  private async rotateSession() {
    try {
      // Refresh the session
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        logger.error('Session rotation failed:', error);
        this.handleSessionError('rotation_failed');
        return;
      }
      
      if (data.session) {
        this.sessionStartTime = Date.now();
        if (import.meta.env.DEV) {
          logger.log('Session rotated successfully');
        }
        
        // Log security event
        this.logSecurityEvent('session_rotated', {
          timestamp: new Date().toISOString(),
          userAgent: this.userAgent,
          ipAddress: this.ipAddress
        });
      }
    } catch (error) {
      logger.error('Session rotation error:', error);
      this.handleSessionError('rotation_error');
    }
  }

  private monitorSecurity() {
    // Check for suspicious activity every minute
    setInterval(() => {
      const validation = this.validateSession();
      
      if (validation.riskLevel === 'high') {
        this.handleSecurityThreat(validation);
      } else if (validation.riskLevel === 'medium') {
        this.logSecurityEvent('medium_risk_detected', {
          warnings: validation.warnings,
          timestamp: new Date().toISOString()
        });
      }
    }, 60 * 1000);
  }

  public validateSession(): SessionValidationResult {
    const warnings: string[] = [];
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    
    // Check session age
    const sessionAge = Date.now() - this.sessionStartTime;
    const maxSessionAge = 8 * 60 * 60 * 1000; // 8 hours
    
    if (sessionAge > maxSessionAge) {
      warnings.push('Session age exceeds maximum limit');
      riskLevel = 'high';
    }
    
    // Check for inactivity
    const inactivityTime = Date.now() - this.lastActivity;
    const maxInactivity = 2 * 60 * 60 * 1000; // 2 hours
    
    if (inactivityTime > maxInactivity) {
      warnings.push('Extended inactivity detected');
      if (riskLevel === 'low') riskLevel = 'medium';
    }
    
    // Check user agent consistency
    if (navigator.userAgent !== this.userAgent) {
      warnings.push('User agent changed during session');
      riskLevel = 'high';
    }
    
    // Check for multiple tabs (basic detection)
    if (!document.hasFocus() && sessionStorage.getItem('tab_active') === 'true') {
      warnings.push('Multiple active tabs detected');
      if (riskLevel === 'low') riskLevel = 'medium';
    }
    
    const shouldRotate = sessionAge > this.rotationInterval;
    
    return {
      isValid: riskLevel !== 'high',
      shouldRotate,
      riskLevel,
      warnings
    };
  }

  private handleSecurityThreat(validation: SessionValidationResult) {
    if (import.meta.env.DEV) {
      logger.warn('High security risk detected:', validation.warnings);
    }
    
    // Log security threat
    this.logSecurityEvent('security_threat_detected', {
      riskLevel: validation.riskLevel,
      warnings: validation.warnings,
      timestamp: new Date().toISOString(),
      sessionAge: Date.now() - this.sessionStartTime,
      userAgent: navigator.userAgent,
      originalUserAgent: this.userAgent
    });
    
    // Force session refresh or logout
    this.handleSessionError('security_threat');
  }

  private async handleSessionError(reason: string) {
    if (import.meta.env.DEV) {
      logger.log('Handling session error:', reason);
    }
    
    try {
      // Log the security event
      await this.logSecurityEvent('session_security_action', {
        action: 'force_logout',
        reason,
        timestamp: new Date().toISOString()
      });
      
      // Sign out user
      await supabase.auth.signOut();
      
      // Redirect to login with security notice
      const currentPath = window.location.pathname;
      window.location.href = `/auth?security=true&redirect=${encodeURIComponent(currentPath)}`;
      
    } catch (error) {
      logger.error('Error handling session security:', error);
      
      // Fallback: force page reload
      window.location.reload();
    }
  }

  private async logSecurityEvent(eventType: string, data: any) {
    try {
      // Use the anonymous session tracking if available
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'security_event', {
          event_category: 'session_security',
          event_label: eventType,
          custom_parameters: data
        });
      }
      
      // Log to console for development
      if (import.meta.env.DEV) {
        logger.log('Security Event:', eventType, data);
      }
      
    } catch (error) {
      logger.error('Failed to log security event:', error);
    }
  }

  public getSessionInfo() {
    return {
      startTime: this.sessionStartTime,
      lastActivity: this.lastActivity,
      age: Date.now() - this.sessionStartTime,
      inactiveTime: Date.now() - this.lastActivity,
      ipAddress: this.ipAddress,
      userAgent: this.userAgent,
      validation: this.validateSession()
    };
  }

  public forceRotation() {
    return this.rotateSession();
  }
}

// Initialize session security
const sessionSecurity = new SessionSecurityManager();

export { sessionSecurity, SessionSecurityManager };