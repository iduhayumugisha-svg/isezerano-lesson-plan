/**
 * ISEZERANO ONLINE – GS GITUMBA
 * Google Analytics 4 (GA4) & In-App Telemetry Service
 * Measurement ID: G-XVJBQX90HX
 */

import { getFirebaseConfig } from './storageService';

declare global {
  interface Window {
    dataLayer?: any[];
    gtag?: (...args: any[]) => void;
    __ga4_initialized?: boolean;
  }
}

export const GA_MEASUREMENT_ID = 'G-XVJBQX90HX';

const ANALYTICS_STORAGE_KEY = 'isezerano_analytics_telemetry_v1';

export interface AnalyticsSummary {
  measurementId: string;
  isGaLoaded: boolean;
  totalPageViews: number;
  pageViewsByPage: Record<string, number>;
  totalWhatsAppClicks: number;
  totalLessonPlansCreated: number;
  totalPdfExports: number;
  recentEvents: Array<{
    id: string;
    eventName: string;
    label: string;
    timestamp: string;
    page: string;
  }>;
  firstTrackedDate: string;
  lastActiveDate: string;
}

const getDefaultTelemetry = (): AnalyticsSummary => ({
  measurementId: GA_MEASUREMENT_ID,
  isGaLoaded: false,
  totalPageViews: 0,
  pageViewsByPage: {
    home: 0,
    dashboard: 0,
    create: 0,
    saved: 0,
    about: 0,
    contact: 0,
    privacy: 0,
    admin: 0
  },
  totalWhatsAppClicks: 0,
  totalLessonPlansCreated: 0,
  totalPdfExports: 0,
  recentEvents: [],
  firstTrackedDate: new Date().toISOString(),
  lastActiveDate: new Date().toISOString()
});

const loadLocalTelemetry = (): AnalyticsSummary => {
  try {
    const raw = localStorage.getItem(ANALYTICS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...getDefaultTelemetry(),
        ...parsed,
        pageViewsByPage: {
          ...getDefaultTelemetry().pageViewsByPage,
          ...(parsed.pageViewsByPage || {})
        }
      };
    }
  } catch (e) {
    console.warn('Failed to parse analytics telemetry cache:', e);
  }
  return getDefaultTelemetry();
};

const saveLocalTelemetry = (data: AnalyticsSummary): void => {
  try {
    localStorage.setItem(ANALYTICS_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to save analytics telemetry:', e);
  }
};

/**
 * Initialize Google Analytics 4 (gtag.js)
 * Checks for duplicate script tags and attaches gtag cleanly
 */
export const initGoogleAnalytics = (): void => {
  if (typeof window === 'undefined') return;

  const config = getFirebaseConfig();
  const measurementId = config.measurementId || GA_MEASUREMENT_ID;

  if (window.__ga4_initialized) {
    return;
  }

  try {
    // 1. Prepare dataLayer
    window.dataLayer = window.dataLayer || [];
    if (!window.gtag) {
      window.gtag = function () {
        window.dataLayer?.push(arguments);
      };
    }

    // 2. Insert gtag script if not already in document
    const existingScript = document.querySelector(`script[src*="googletagmanager.com/gtag/js?id="]`);
    if (!existingScript) {
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
      script.onload = () => {
        window.__ga4_initialized = true;
      };
      script.onerror = () => {
        console.warn('Google Analytics script blocked by network or ad blocker.');
      };
      document.head.appendChild(script);
    } else {
      window.__ga4_initialized = true;
    }

    // 3. Configure GA4 with manual SPA page_view dispatch to avoid double-counting
    window.gtag('js', new Date());
    window.gtag('config', measurementId, {
      send_page_view: false, // We dispatch custom SPA page_views accurately
      anonymize_ip: true,
      cookie_flags: 'SameSite=None;Secure'
    });

    window.__ga4_initialized = true;
  } catch (err) {
    console.warn('Google Analytics initialization notice:', err);
  }
};

/**
 * Track an SPA Page View
 */
export const trackPageView = (pageName: string, title?: string): void => {
  if (typeof window === 'undefined') return;

  const pagePath = pageName === 'home' ? '/' : `/${pageName}`;
  const pageTitle = title || `ISEZERANO ONLINE – ${pageName.toUpperCase()}`;

  // 1. Send to Google Analytics 4
  if (window.gtag) {
    try {
      window.gtag('event', 'page_view', {
        page_title: pageTitle,
        page_location: window.location.href,
        page_path: pagePath
      });
    } catch (err) {
      console.warn('GA4 page_view dispatch error:', err);
    }
  }

  // 2. Record in internal telemetry for the Admin Dashboard
  try {
    const telemetry = loadLocalTelemetry();
    telemetry.totalPageViews += 1;
    telemetry.lastActiveDate = new Date().toISOString();
    telemetry.pageViewsByPage[pageName] = (telemetry.pageViewsByPage[pageName] || 0) + 1;

    // Keep recent 20 events
    telemetry.recentEvents = [
      {
        id: `pv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        eventName: 'page_view',
        label: `Viewed ${pageTitle}`,
        timestamp: new Date().toISOString(),
        page: pageName
      },
      ...telemetry.recentEvents.slice(0, 19)
    ];

    saveLocalTelemetry(telemetry);
  } catch (err) {
    console.warn('Local telemetry record error:', err);
  }
};

/**
 * Track a custom Google Analytics 4 event
 */
export const trackEvent = (eventName: string, params: Record<string, any> = {}): void => {
  if (typeof window === 'undefined') return;

  // 1. Send to GA4
  if (window.gtag) {
    try {
      window.gtag('event', eventName, params);
    } catch (err) {
      console.warn('GA4 custom event dispatch notice:', err);
    }
  }

  // 2. Record in internal telemetry for Admin Dashboard
  try {
    const telemetry = loadLocalTelemetry();
    telemetry.lastActiveDate = new Date().toISOString();

    if (eventName === 'whatsapp_click') {
      telemetry.totalWhatsAppClicks += 1;
    } else if (eventName === 'lesson_plan_created') {
      telemetry.totalLessonPlansCreated += 1;
    } else if (eventName === 'lesson_plan_export_pdf') {
      telemetry.totalPdfExports += 1;
    }

    const readableLabel = 
      eventName === 'whatsapp_click' ? 'WhatsApp conversation opened (0782971258)' :
      eventName === 'lesson_plan_created' ? `New CBC Lesson Plan generated (${params.subject || 'CBC'})` :
      eventName === 'lesson_plan_export_pdf' ? `Exported A4 PDF Lesson Plan (${params.subject || ''})` :
      eventName === 'admin_login_success' ? 'Administrator signed in securely' :
      `Event: ${eventName}`;

    telemetry.recentEvents = [
      {
        id: `ev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        eventName,
        label: readableLabel,
        timestamp: new Date().toISOString(),
        page: params.page || 'app'
      },
      ...telemetry.recentEvents.slice(0, 19)
    ];

    saveLocalTelemetry(telemetry);
  } catch (err) {
    console.warn('Telemetry event record error:', err);
  }
};

/**
 * Track WhatsApp button interaction
 */
export const trackWhatsAppClick = (sourcePage: string): void => {
  trackEvent('whatsapp_click', {
    phone_number: '250782971258',
    channel: 'floating_button',
    page: sourcePage,
    timestamp: new Date().toISOString()
  });
};

/**
 * Get the current Analytics telemetry summary for the Admin Dashboard
 */
export const getAnalyticsSummary = (): AnalyticsSummary => {
  const current = loadLocalTelemetry();
  current.isGaLoaded = Boolean(typeof window !== 'undefined' && window.__ga4_initialized);
  current.measurementId = getFirebaseConfig().measurementId || GA_MEASUREMENT_ID;
  return current;
};

/**
 * Reset local telemetry counters (Admin action)
 */
export const resetLocalTelemetry = (): AnalyticsSummary => {
  const reset = getDefaultTelemetry();
  saveLocalTelemetry(reset);
  return reset;
};
