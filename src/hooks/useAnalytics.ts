import { useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface AnalyticsEvent {
  action_type: 'page_view' | 'form_submit' | 'ai_interaction' | 'download' | 'click' | 'conversion' | 'error';
  page_path?: string;
  referrer?: string;
  session_id?: string;
  event_data?: Record<string, unknown>;
}

const useSafeLocation = () => {
  try {
    return useLocation();
  } catch {
    return null;
  }
};

export const useAnalytics = () => {
  const location = useSafeLocation();
  const { user } = useAuth();
  const lastTrackedPathRef = useRef<string | null>(null);

  const getSessionId = useCallback(() => {
    let sessionId = localStorage.getItem('analytics_session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('analytics_session_id', sessionId);
    }
    return sessionId;
  }, []);

  const trackEvent = useCallback(async (event: AnalyticsEvent) => {
    try {
      const sessionId = getSessionId();
      const pagePath = event.page_path || location?.pathname || window.location.pathname;

      await supabase.from('website_analytics').insert({
        action_type: event.action_type,
        page_path: pagePath,
        referrer: event.referrer,
        session_id: sessionId,
        user_id: user?.id || null,
        ip_address: null,
        user_agent: navigator.userAgent,
        event_data: {
          viewport: { width: window.innerWidth, height: window.innerHeight },
          timestamp: Date.now(),
          ...event.event_data
        }
      });
    } catch {
      // Silently fail analytics
    }
  }, [user?.id, getSessionId, location?.pathname]);

  // Deduplicated page view tracking
  useEffect(() => {
    const currentPath = location?.pathname;
    if (currentPath && currentPath !== lastTrackedPathRef.current) {
      lastTrackedPathRef.current = currentPath;
      trackEvent({
        action_type: 'page_view',
        page_path: currentPath,
        referrer: document.referrer || undefined,
      });
    }
  }, [location?.pathname, trackEvent]);

  const trackFormSubmission = useCallback((formType: string, formData?: Record<string, unknown>) => {
    trackEvent({
      action_type: 'form_submit',
      event_data: { form_type: formType, form_data: formData }
    });
  }, [trackEvent]);

  const trackAIInteraction = useCallback((aiEndpoint: string, interactionData?: Record<string, unknown>) => {
    trackEvent({
      action_type: 'ai_interaction',
      event_data: { ai_endpoint: aiEndpoint, ...interactionData }
    });
  }, [trackEvent]);

  const trackConversion = useCallback((conversionType: string, conversionData?: Record<string, unknown>) => {
    trackEvent({
      action_type: 'conversion',
      event_data: { conversion_type: conversionType, ...conversionData }
    });
  }, [trackEvent]);

  const trackClick = useCallback((element: string, elementData?: Record<string, unknown>) => {
    trackEvent({
      action_type: 'click',
      event_data: { element, ...elementData }
    });
  }, [trackEvent]);

  const trackError = useCallback((errorType: string, errorMessage?: string, errorData?: Record<string, unknown>) => {
    trackEvent({
      action_type: 'error',
      event_data: { error_type: errorType, error_message: errorMessage, ...errorData }
    });
  }, [trackEvent]);

  return { trackEvent, trackFormSubmission, trackAIInteraction, trackConversion, trackClick, trackError };
};

// Performance tracking hook
export const usePerformanceTracking = () => {
  const { trackEvent } = useAnalytics();

  useEffect(() => {
    if ('performance' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            trackEvent({
              action_type: 'page_view',
              event_data: {
                performance: {
                  dns_lookup: navEntry.domainLookupEnd - navEntry.domainLookupStart,
                  connection_time: navEntry.connectEnd - navEntry.connectStart,
                  response_time: navEntry.responseEnd - navEntry.responseStart,
                  dom_load: navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart,
                  page_load: navEntry.loadEventEnd - navEntry.loadEventStart,
                  total_time: navEntry.loadEventEnd - navEntry.fetchStart
                }
              }
            });
          }
        }
      });
      observer.observe({ entryTypes: ['navigation'] });
      return () => observer.disconnect();
    }
  }, [trackEvent]);

  useEffect(() => {
    const loadWebVitals = async () => {
      try {
        const webVitals = await import('web-vitals');
        const reportVital = (name: string, metric: { value: number; rating: string }) => {
          trackEvent({
            action_type: 'page_view',
            event_data: { web_vital: { name, value: metric.value, rating: metric.rating } }
          });
        };
        webVitals.onCLS((m) => reportVital('CLS', m));
        webVitals.onINP?.((m) => reportVital('INP', m));
        webVitals.onFCP((m) => reportVital('FCP', m));
        webVitals.onLCP((m) => reportVital('LCP', m));
        webVitals.onTTFB((m) => reportVital('TTFB', m));
      } catch {
        // web-vitals not available
      }
    };
    loadWebVitals();
  }, [trackEvent]);

  return { trackEvent };
};
