import { createRoot } from 'react-dom/client'
import './index.css'

const rootEl = document.getElementById('root');

if (!rootEl) {
  throw new Error('Root element not found');
}

const requiredEnv = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_PUBLISHABLE_KEY',
] as const;

const missingEnv = requiredEnv.filter((key) => !import.meta.env[key]);

if (missingEnv.length > 0) {
  rootEl.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:#f4f4f4;color:#2b2b2b;font-family:Outfit,system-ui,sans-serif;">
      <div style="max-width:720px;width:100%;background:#fff;border:1px solid #d6d6d6;border-radius:12px;padding:24px;box-shadow:0 2px 10px rgba(43,43,43,0.08);">
        <h1 style="margin:0 0 12px 0;font-size:26px;line-height:1.2;">Configuration Required</h1>
        <p style="margin:0 0 12px 0;font-size:16px;line-height:1.6;">This deployment is missing required environment variables. Configure these in Vercel Project Settings - Environment Variables, then redeploy:</p>
        <pre style="margin:0;padding:12px;background:#f4f4f4;border:1px solid #d6d6d6;border-radius:8px;overflow:auto;line-height:1.6;">${missingEnv.join('\n')}</pre>
      </div>
    </div>
  `;
} else {
  import('./App.tsx').then(({ default: App }) => {
    createRoot(rootEl).render(<App />);
  }).catch((error) => {
    console.error('Failed to load App component:', error);
    rootEl.innerHTML = `
      <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:#f4f4f4;color:#2b2b2b;font-family:Outfit,system-ui,sans-serif;">
        <div style="max-width:720px;width:100%;background:#fff;border:1px solid #d6d6d6;border-radius:12px;padding:24px;box-shadow:0 2px 10px rgba(43,43,43,0.08);">
          <h1 style="margin:0 0 12px 0;font-size:26px;line-height:1.2;">Application Load Error</h1>
          <p style="margin:0 0 12px 0;font-size:16px;line-height:1.6;">We encountered an error loading the application. Please try refreshing the page or contact support if the problem persists.</p>
          <button onclick="window.location.reload()" style="display:inline-block;margin-top:12px;padding:12px 24px;background:#BB0000;color:#fff;border:none;border-radius:4px;font-size:14px;cursor:pointer;font-family:Outfit,system-ui,sans-serif;">Refresh Page</button>
        </div>
      </div>
    `;
  });
}

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Silent fail in production to avoid console noise
    });
  });
}
