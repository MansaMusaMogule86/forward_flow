// Branded Email Template System for Forward Focus Elevation
// OSU Scarlet themed email templates with premium design

import { SITE_CONFIG, getSiteUrl } from './site-config.ts';

interface EmailVariables {
  firstName?: string;
  email?: string;
  lastLogin?: string;
  coachAvailability?: string;
  newResourcesCount?: number;
  resourcesViewed?: number;
  aiChatsCount?: number;
  healingMinutes?: number;
  memberSince?: string;
  sessionsAttended?: number;
  nextAvailableSession?: string;
  callType?: 'live' | 'recording';
  zoomLink?: string;
  recordingLink?: string;
  callTopic?: string;
  callDate?: string;
  unsubscribeLink?: string;
  preferencesLink?: string;
}

const OSU_SCARLET = '#BB0000';
const OSU_DARK_RED = '#990000';
const OSU_GRAY = '#666666';
const OFF_WHITE = '#F4F4F4';
const TEXT_DARK = '#2B2B2B';

export function getBaseTemplate(content: string, variables: EmailVariables): string {
  const firstName = variables.firstName || 'Friend';
  const unsubscribeLink = variables.unsubscribeLink || '#';
  const preferencesLink = variables.preferencesLink || '#';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${SITE_CONFIG.name}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&display=swap');
    
    body { 
      margin: 0; 
      padding: 0; 
      font-family: 'Outfit', Arial, sans-serif; 
      background-color: ${OFF_WHITE}; 
      -webkit-font-smoothing: antialiased;
    }
    
    table { border-collapse: collapse; }
    
    .container { 
      max-width: 600px; 
      margin: 40px auto; 
      background-color: #ffffff; 
      border: 1px solid #D6D6D6;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
    }
    
    .header { 
      background: linear-gradient(135deg, ${OSU_SCARLET} 0%, ${OSU_DARK_RED} 100%); 
      padding: 48px 32px; 
      text-align: center; 
    }
    
    .header-title {
      color: #ffffff;
      font-size: 28px;
      font-weight: 700;
      margin: 0;
      letter-spacing: 0.02em;
    }
    
    .header-subtitle {
      color: rgba(255, 255, 255, 0.85);
      font-size: 14px;
      margin-top: 8px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
    }
    
    .content { padding: 40px 32px; position: relative; }
    
    .greeting { 
      font-size: 24px; 
      font-weight: 700; 
      color: ${TEXT_DARK}; 
      margin: 0 0 24px 0; 
    }
    
    .text { 
      color: ${OSU_GRAY}; 
      font-size: 16px; 
      line-height: 1.6; 
      margin: 0 0 24px 0; 
    }
    
    .button { 
      display: inline-block; 
      background: ${OSU_SCARLET}; 
      color: #ffffff !important; 
      padding: 16px 36px; 
      border-radius: 6px; 
      text-decoration: none; 
      font-weight: 700; 
      font-size: 16px; 
      margin: 24px 0; 
      box-shadow: 0 2px 10px rgba(187, 0, 0, 0.15);
      transition: background 0.2s ease;
    }
    
    .section { 
      margin: 32px 0; 
      padding: 24px; 
      background: #FAFAFA; 
      border-radius: 8px; 
      border-left: 4px solid ${OSU_SCARLET};
    }
    
    .footer { 
      background: #FAFAFA; 
      padding: 40px 32px; 
      text-align: center; 
      font-size: 12px; 
      color: ${OSU_GRAY}; 
      border-top: 1px solid #E0E0E0;
    }
    
    .footer a { color: ${OSU_SCARLET}; text-decoration: none; font-weight: 600; }
    
    .divider { height: 1px; background: #E0E0E0; margin: 32px 0; }
    
    @media only screen and (max-width: 600px) {
      .container { margin: 0; width: 100%; border-radius: 0; }
      .content { padding: 32px 20px; }
      .greeting { font-size: 22px; }
    }
  </style>
</head>
<body>
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center">
        <table class="container" width="600" cellpadding="0" cellspacing="0">
          <!-- Header -->
          <tr>
            <td class="header">
              <h1 class="header-title">${SITE_CONFIG.name}</h1>
              <div class="header-subtitle">Empowering Justice-Impacted Families</div>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td class="content">
              <h2 class="greeting">Hi ${firstName}! 👋</h2>
              ${content}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td class="footer">
              <p style="margin: 0 0 16px 0;">
                <a href="${preferencesLink}">Email Preferences</a> | 
                <a href="${unsubscribeLink}">Unsubscribe</a>
              </p>
              <p style="margin: 0 0 12px 0;">
                <strong>${SITE_CONFIG.name}</strong> • ${new Date().getFullYear()}
              </p>
              <p style="margin: 0; color: #9A9A9A; line-height: 1.5;">
                Empowering Ohio's 88 counties with healing, growth, and second chances.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

