declare global {
  interface Window {
    gtag: (
      command: 'event',
      action: string,
      params?: Record<string, any>
    ) => void;
    dataLayer: any[];
  }
}

// Define specific parameter interfaces for better type safety where possible
export interface BaseEventParams {
  userId?: string;
  teamId?: string | number;
  eventKey?: string;
  timestamp?: string;
  debug_mode?: boolean;
  [key: string]: any;
}

/**
 * Tracks a custom event to Google Analytics.
 * @param eventName - The name of the event (e.g., 'pit_form_submit', 'page_view_custom').
 * @param params - Additional parameters for the event.
 */
export const trackEvent = (eventName: string, params: BaseEventParams = {}) => {
  if (typeof window === 'undefined') return;

  // Check if gtag is available
  if (typeof window.gtag === 'function') {
    const eventParams = {
      ...params,
      timestamp: params.timestamp || new Date().toISOString(),
    };

    // In development, enable debug mode so events show up in GA DebugView
    // This helps verify events even if the extension isn't installed
    if (import.meta.env.DEV) {
      eventParams.debug_mode = true;
    }

    // Check if the actual GA library has loaded
    // @ts-ignore
    const isScriptBlocked = typeof window.google_tag_manager === 'undefined';
    
    window.gtag('event', eventName, eventParams);

    // Always log to console in DEV
    if (import.meta.env.DEV) {
      if (isScriptBlocked) {
         console.log(`[Analytics] 🛡️ Script blocked by extension. Event simulated: ${eventName}`, eventParams);
      } else {
         console.log(`[Analytics] 📡 Event sent to GA: ${eventName}`, eventParams);
      }
    }
  } else {
    // If gtag is missing, it's likely an AdBlocker or script load failure
    console.warn(`[Analytics] ⚠️ 'gtag' function not found. Event '${eventName}' was NOT sent.`);
    console.warn(`[Analytics] 💡 Tip: Disable AdBlockers or check if 'G-Z88MM7BTBM' is blocked.`);
    
    // Fallback: Check dataLayer
    if (window.dataLayer && Array.isArray(window.dataLayer)) {
        console.log(`[Analytics] ℹ️ dataLayer exists. Pushing event manually...`);
        window.dataLayer.push({
            event: eventName,
            ...params
        });
    }
  }
};
