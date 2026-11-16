import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { EditablePageId, WebsitePageContent } from '../types/platform';
import { initFirestoreIfConfigured } from '../config/firebase';

const PAGE_STORAGE_PREFIX = 'isezerano_page_v2_';
const LEGACY_PAGE_STORAGE_PREFIX = 'isezerano_page_v1_';

export const DEFAULT_PAGES_CONTENT: Record<EditablePageId, WebsitePageContent> = {
  home: {
    id: 'home',
    pageName: 'Homepage & Hero',
    badge: 'ISEZERANO ONLINE Newsroom',
    title: 'Trusted News, Analysis & Community Stories',
    subtitle: 'Read verified breaking news, national reports, analysis, and official public announcements updated daily on ISEZERANO ONLINE.',
    highlightBox: {
      enabled: false,
      badge: '',
      title: '',
      content: ''
    },
    sections: [],
    isPublished: true,
    lastUpdated: new Date().toISOString(),
    updatedBy: 'system'
  },

  about: {
    id: 'about',
    pageName: 'About Us',
    badge: '',
    title: '',
    subtitle: '',
    bodyHtml: '',
    highlightBox: {
      enabled: false,
      badge: '',
      title: '',
      content: ''
    },
    sections: [],
    isPublished: false,
    lastUpdated: '',
    updatedBy: ''
  },

  contact: {
    id: 'contact',
    pageName: 'Contact Us',
    badge: '',
    title: '',
    subtitle: '',
    bodyHtml: '',
    showContactForm: false,
    highlightBox: {
      enabled: false,
      badge: '',
      title: '',
      content: ''
    },
    contactData: {
      schoolName: '',
      address: '',
      email: '',
      phone: '',
      whatsapp: '',
      workingHours: ''
    },
    sections: [],
    isPublished: false,
    lastUpdated: '',
    updatedBy: ''
  },

  privacy: {
    id: 'privacy',
    pageName: 'Privacy Policy',
    badge: '',
    title: '',
    subtitle: '',
    bodyHtml: '',
    highlightBox: {
      enabled: false,
      badge: '',
      title: '',
      content: ''
    },
    sections: [],
    isPublished: false,
    lastUpdated: '',
    updatedBy: ''
  },

  terms: {
    id: 'terms',
    pageName: 'Terms & Conditions',
    badge: '',
    title: '',
    subtitle: '',
    bodyHtml: '',
    highlightBox: {
      enabled: false,
      badge: '',
      title: '',
      content: ''
    },
    sections: [],
    isPublished: false,
    lastUpdated: '',
    updatedBy: ''
  }
};

export function sanitizeStaticPageHtml(html: string): string {
  if (!html || typeof html !== 'string') return '';
  let clean = html
    .replace(/<\s*(script|iframe|object|embed|style|link|meta|base|form)[^>]*>[\s\S]*?<\/\s*\1\s*>/gi, '')
    .replace(/<\s*(script|iframe|object|embed|style|link|meta|base|form)[^>]*\/?\s*>/gi, '')
    .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(href|src)\s*=\s*(["'])\s*(?:javascript|vbscript|data:text\/html)[^"']*\2/gi, '$1="#"');
  return clean.trim();
}

export function isRichHtmlEmpty(html?: string): boolean {
  if (!html || typeof html !== 'string') return true;
  if (/<img\b/i.test(html)) return false;
  const textOnly = html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\u200B/g, '')
    .trim();
  return textOnly.length === 0;
}

export function hasStaticPageContent(content: WebsitePageContent): boolean {
  const hasHighlight =
    Boolean(content.highlightBox?.enabled) &&
    Boolean(
      content.highlightBox?.badge?.trim() ||
        content.highlightBox?.title?.trim() ||
        content.highlightBox?.content?.trim()
    );
  const hasSections = (content.sections || []).some(
    (s) =>
      Boolean(s.title?.trim()) ||
      Boolean(s.content?.trim()) ||
      (Array.isArray(s.bullets) && s.bullets.some((b) => Boolean(b?.trim())))
  );
  const hasContactDetails =
    content.id === 'contact' &&
    Boolean(
      content.showContactForm ||
        content.contactData?.schoolName?.trim() ||
        content.contactData?.address?.trim() ||
        content.contactData?.phone?.trim() ||
        content.contactData?.whatsapp?.trim() ||
        content.contactData?.email?.trim() ||
        content.contactData?.workingHours?.trim()
    );

  return (
    Boolean(content.badge?.trim()) ||
    Boolean(content.title?.trim()) ||
    Boolean(content.subtitle?.trim()) ||
    !isRichHtmlEmpty(content.bodyHtml) ||
    hasHighlight ||
    hasSections ||
    hasContactDetails
  );
}

function isLegacySystemStaticRecord(pageId: EditablePageId, remote: Partial<WebsitePageContent>): boolean {
  if (pageId === 'home') return false;
  if (remote.updatedBy === 'system') return true;
  return false;
}

function normalizeLoadedPage(pageId: EditablePageId, remote: Partial<WebsitePageContent>): WebsitePageContent {
  if (isLegacySystemStaticRecord(pageId, remote)) {
    return { ...DEFAULT_PAGES_CONTENT[pageId] };
  }
  const merged: WebsitePageContent = {
    ...DEFAULT_PAGES_CONTENT[pageId],
    ...remote,
    id: pageId,
    bodyHtml: sanitizeStaticPageHtml(remote.bodyHtml || '')
  };
  return merged;
}

function stripUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value
      .filter((item) => item !== undefined)
      .map((item) => stripUndefinedDeep(item)) as unknown as T;
  }
  if (value && typeof value === 'object') {
    const cleaned: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (val !== undefined) {
        cleaned[key] = stripUndefinedDeep(val);
      }
    }
    return cleaned as T;
  }
  return value;
}

/**
 * Fetch published content for a given page with localStorage cache and fallback to defaults
 */
export const getPageContent = async (pageId: EditablePageId): Promise<WebsitePageContent> => {
  try {
    localStorage.removeItem(`${LEGACY_PAGE_STORAGE_PREFIX}${pageId}`);
  } catch {
    // ignore
  }

  const db = initFirestoreIfConfigured();
  if (db) {
    try {
      const docRef = doc(db, 'website_pages', pageId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const remote = snap.data() as WebsitePageContent;
        const normalized = normalizeLoadedPage(pageId, remote);
        try {
          localStorage.setItem(`${PAGE_STORAGE_PREFIX}${pageId}`, JSON.stringify(normalized));
        } catch {
          // ignore cache error
        }
        return normalized;
      }
    } catch (err) {
      console.warn(`Could not fetch page "${pageId}" from Firestore, using cache:`, err);
    }
  }

  // Fallback to localStorage cache
  try {
    const cached = localStorage.getItem(`${PAGE_STORAGE_PREFIX}${pageId}`);
    if (cached) {
      const parsed = JSON.parse(cached) as Partial<WebsitePageContent>;
      return normalizeLoadedPage(pageId, parsed);
    }
  } catch {
    // ignore
  }

  return DEFAULT_PAGES_CONTENT[pageId];
};

/**
 * Fetch all editable pages content
 */
export const getAllPagesContent = async (): Promise<Record<EditablePageId, WebsitePageContent>> => {
  const pageIds: EditablePageId[] = ['home', 'about', 'contact', 'privacy', 'terms'];
  const results = await Promise.all(pageIds.map(id => getPageContent(id)));
  
  return {
    home: results[0],
    about: results[1],
    contact: results[2],
    privacy: results[3],
    terms: results[4]
  };
};

/**
 * Real-time subscription to published page updates.
 * Any update published on another device appears instantly without refresh.
 */
export const subscribeToPageContent = (
  pageId: EditablePageId,
  onUpdate: (page: WebsitePageContent) => void
): (() => void) => {
  const db = initFirestoreIfConfigured();
  if (!db) return () => {};

  try {
    const docRef = doc(db, 'website_pages', pageId);
    return onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          const remote = snap.data() as WebsitePageContent;
          const normalized = normalizeLoadedPage(pageId, remote);
          try {
            localStorage.setItem(`${PAGE_STORAGE_PREFIX}${pageId}`, JSON.stringify(normalized));
          } catch {
            // ignore
          }
          onUpdate(normalized);
        }
      },
      (error) => {
        console.warn(`Real-time subscription error for page ${pageId}:`, error);
      }
    );
  } catch (err) {
    console.warn(`Failed to attach snapshot listener for page ${pageId}:`, err);
    return () => {};
  }
};

/**
 * Save page content to Firestore and cache
 * Requires verified Administrator privileges enforced by Firestore Security Rules
 */
export const savePageContent = async (
  page: WebsitePageContent,
  adminUid: string,
  publish: boolean = true
): Promise<{ success: boolean; error?: string; isLocalOnly?: boolean; warning?: string }> => {
  const cleanHtml = sanitizeStaticPageHtml(page.bodyHtml || '');
  const updatedPage = stripUndefinedDeep<WebsitePageContent>({
    ...page,
    bodyHtml: isRichHtmlEmpty(cleanHtml) ? '' : cleanHtml,
    isPublished: publish,
    lastUpdated: new Date().toISOString(),
    updatedBy: adminUid
  });

  // Always update local storage first so user edits are NEVER lost
  try {
    localStorage.setItem(`${PAGE_STORAGE_PREFIX}${page.id}`, JSON.stringify(updatedPage));
  } catch (cacheErr) {
    console.warn('Failed to cache page in localStorage:', cacheErr);
  }

  // Notify public views of live update immediately on this browser
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('website_pages_updated', {
        detail: { pageId: page.id, page: updatedPage }
      })
    );
  }

  const db = initFirestoreIfConfigured();
  if (db) {
    try {
      const docRef = doc(db, 'website_pages', page.id);
      await setDoc(docRef, updatedPage);
      return { success: true };
    } catch (err: any) {
      console.warn(`Firestore write warning for page "${page.id}":`, err?.code || err?.message);
      const isPermissionDenied = err?.code === 'permission-denied' || 
        (err?.message && (err.message.includes('permission') || err.message.includes('Permission')));

      if (isPermissionDenied) {
        return {
          success: true,
          isLocalOnly: true,
          warning: 'Saved locally on this device. (Cloud sync requires publishing the updated firestore.rules in Firebase Console).'
        };
      }

      return {
        success: true,
        isLocalOnly: true,
        warning: `Saved locally on this device. (Cloud sync notice: ${err?.message || 'Server connection error'})`
      };
    }
  }

  return { success: true, isLocalOnly: true };
};

/**
 * Reset a page to its default state (empty for static info pages, preset for homepage)
 */
export const restorePageDefaults = async (
  pageId: EditablePageId,
  adminUid: string
): Promise<{ success: boolean; error?: string }> => {
  const original = {
    ...DEFAULT_PAGES_CONTENT[pageId],
    lastUpdated: new Date().toISOString(),
    updatedBy: adminUid
  };
  return savePageContent(original, adminUid, pageId === 'home');
};
