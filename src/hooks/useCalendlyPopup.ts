import { useState, useEffect } from 'react';

declare global {
  interface Window {
    Calendly?: any;
  }
}

export const useCalendlyPopup = () => {
  const [calendlyReady, setCalendlyReady] = useState(false);

  useEffect(() => {
    // Check immediately if already loaded
    if (window.Calendly) {
      setCalendlyReady(true);
      return;
    }

    // Dynamically load the Calendly widget script
    const existingScript = document.getElementById('calendly-widget-script');
    if (!existingScript) {
      const script = document.createElement('script');
      script.id = 'calendly-widget-script';
      script.src = 'https://assets.calendly.com/assets/external/widget.js';
      script.async = true;
      document.head.appendChild(script);
    }

    // Poll for Calendly with timeout
    let attempts = 0;
    const maxAttempts = 20; // 10 seconds
    const checkCalendly = setInterval(() => {
      attempts++;

      if (window.Calendly) {
        setCalendlyReady(true);
        clearInterval(checkCalendly);
      } else if (attempts >= maxAttempts) {
        console.error('Calendly failed to load after 10 seconds');
        clearInterval(checkCalendly);
      }
    }, 500);

    return () => clearInterval(checkCalendly);
  }, []);

  const openCalendly = (url: string) => {
    if (!calendlyReady || !window.Calendly) {
      console.error('Calendly not ready or not loaded');
      alert('Calendly is still loading. Please wait a moment and try again.');
      return;
    }

    if (!url || typeof url !== 'string') {
      console.error('Invalid Calendly URL provided');
      return;
    }

    try {
      window.Calendly.initPopupWidget({ url });
    } catch (error) {
      console.error('Error opening Calendly:', error);
      alert('Unable to open Calendly. Please try refreshing the page.');
    }
  };

  return { openCalendly, calendlyReady };
};
