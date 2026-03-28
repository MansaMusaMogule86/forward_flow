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
    'mdwkkgancoocvkmecwkm.supabase.co',
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
      // Log unauthorized usage attempt
      console.warn(`Unauthorized domain detected: ${currentDomain}`);
      
      // Create overlay to prevent unauthorized use
      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0.95);
        color: white;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        z-index: 999999;
        font-family: Arial, sans-serif;
        text-align: center;
        padding: 20px;
        box-sizing: border-box;
      `;
      
      overlay.innerHTML = `
        <h1 style="color: #ff4444; margin-bottom: 20px;">⚠️ Unauthorized Usage Detected</h1>
        <h2 style="margin-bottom: 20px;">This application is licensed to ${config.brandName}</h2>
        <p style="margin-bottom: 20px; max-width: 600px; line-height: 1.6;">
          This software is proprietary and protected by copyright law. 
          Unauthorized deployment, white-labeling, or use outside of licensed domains is strictly prohibited.
        </p>
        <p style="margin-bottom: 30px; font-size: 18px; font-weight: bold;">
          ${config.copyrightNotice}
        </p>
        <p style="margin-bottom: 20px; opacity: 0.8;">
          If you believe this is an error, please contact the license holder.
        </p>
        <div style="margin-top: 40px; padding: 20px; background: rgba(255, 255, 255, 0.1); border-radius: 8px;">
          <p style="margin: 0; font-size: 14px; opacity: 0.7;">
            Domain: ${currentDomain} | Time: ${new Date().toISOString()}
          </p>
        </div>
      `;
      
      // Add to document
      document.body.appendChild(overlay);
      
      // Disable page functionality
      document.body.style.overflow = 'hidden';
    }

    // Watermark removed per user request

  }, []);

  return null;
};