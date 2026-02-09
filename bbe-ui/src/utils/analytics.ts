declare global {
  interface Window {
    gtag: (
      command: 'event',
      action: string,
      params?: Record<string, any>
    ) => void;
  }
}

// Define specific parameter interfaces for better type safety where possible
interface BaseEventParams {
  userId?: string;
  teamId?: string | number;
  eventKey?: string;
  timestamp?: string;
  [key: string]: any;
}

/**
 * Tracks a custom event to Google Analytics.
 * @param eventName - The name of the event (e.g., 'pit_form_submit', 'page_view_custom').
 * @param params - Additional parameters for the event.
 */
export const trackEvent = (eventName: string, params: BaseEventParams = {}) => {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    // Ensure common parameters are present if available in the app state
    // Note: In a real app, you might pull these from a store/context if not passed in.
    // For now, we rely on the caller to pass them or we add defaults here.

    const eventParams = {
      ...params,
      timestamp: params.timestamp || new Date().toISOString(),
    };

    window.gtag('event', eventName, eventParams);
    
    // Optional: Log to console in development
    if (import.meta.env.DEV) {
      console.log(`[Analytics] ${eventName}`, eventParams);
    }
  } else {
    if (import.meta.env.DEV) {
       console.warn(`[Analytics] gtag not found. Event ${eventName} not tracked.`);
    }
  }
};
