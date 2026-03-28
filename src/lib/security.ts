import DOMPurify from 'dompurify';

// Sanitize user input to prevent XSS attacks
export const sanitizeInput = (input: string): string => {
  if (!input) return '';
  return DOMPurify.sanitize(input.trim(), {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: []
  });
};

// Validate email format
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate phone number format
export const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^[+]?[1-9][\d]{0,15}$/;
  const cleanPhone = phone.replace(/[\s\-().]/g, '');
  return phoneRegex.test(cleanPhone);
};

// Sanitize and validate form data
export const sanitizeFormData = (data: Record<string, any>): Record<string, any> => {
  const sanitized: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeInput(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
};

// Rate limiting helper
export class RateLimiter {
  private attempts = new Map<string, { count: number; resetTime: number }>();
  
  isRateLimited(key: string, maxAttempts: number = 5, windowMs: number = 60000): boolean {
    const now = Date.now();
    const record = this.attempts.get(key);
    
    if (!record || now > record.resetTime) {
      this.attempts.set(key, { count: 1, resetTime: now + windowMs });
      return false;
    }
    
    if (record.count >= maxAttempts) {
      return true;
    }
    
    record.count++;
    return false;
  }
}

// Mask sensitive contact information
export const maskContactInfo = (contact: string): string => {
  if (!contact) return '';
  
  // Email masking
  if (contact.includes('@')) {
    const [local, domain] = contact.split('@');
    const maskedLocal = local.length > 2 ? local.substring(0, 2) + '***' : '***';
    return `${maskedLocal}@${domain}`;
  }
  
  // Phone masking
  if (/^\+?[\d\s\-().]{10,}$/.test(contact)) {
    const cleanPhone = contact.replace(/[\s\-().]/g, '');
    if (cleanPhone.length > 6) {
      return cleanPhone.substring(0, 3) + '***' + cleanPhone.slice(-2);
    }
  }
  
  // General masking
  return contact.length > 4 ? contact.substring(0, 2) + '***' : '***';
};

// Generate CSRF token
export const generateCSRFToken = (): string => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

// Validate CSRF token (would need server-side validation in real implementation)
export const validateCSRFToken = (token: string, storedToken: string): boolean => {
  return token === storedToken;
};