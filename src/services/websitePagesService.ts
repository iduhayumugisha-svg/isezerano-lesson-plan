import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { EditablePageId, WebsitePageContent } from '../types/websitePages';
import { initFirestoreIfConfigured } from './storageService';

const PAGE_STORAGE_PREFIX = 'isezerano_page_v1_';

export const DEFAULT_PAGES_CONTENT: Record<EditablePageId, WebsitePageContent> = {
  home: {
    id: 'home',
    pageName: 'Homepage & Hero',
    badge: 'Rwanda Competence-Based Curriculum (CBC) Standard',
    title: 'Prepare Official Rwanda CBC Lesson Plans with Confidence',
    subtitle: 'ISEZERANO ONLINE is a specialized pedagogical platform designed to help primary and secondary school educators in Rwanda prepare structured, REB-compliant 8-column lesson plans with ease. Access your tools, saved records, and clean printable A4 exports directly from the dashboard.',
    highlightBox: {
      enabled: true,
      badge: 'About the Platform',
      title: 'From the Classroom of GS GITUMBA to Rwandan Educators Everywhere',
      content: 'Built by a Rwandan teacher serving at GS GITUMBA, located in Buyoga Sector, Rulindo District, Northern Province, Rwanda, this platform supports educators in preparing well-structured lesson plans aligned with Rwanda’s Competence-Based Curriculum (CBC).'
    },
    sections: [
      {
        id: 'format',
        title: 'Official 8-Column CBC Standard',
        content: 'Follows the national format mandated by the Rwanda Basic Education Board (REB) with Timing, Teacher Activities, Learner Activities, Competences, and Assessment.',
        bullets: ['MINEDUC Aligned', 'Full 8 columns', 'Step-by-step guidance']
      },
      {
        id: 'bloom',
        title: "Bloom's Taxonomy Objectives",
        content: 'Structured fields for Knowledge & Understanding, Skills, and Attitudes & Values, keeping lesson aims clear, measurable, and learner-centered.',
        bullets: ['Cognitive Domain', 'Affective Domain', 'Psychomotor Domain']
      },
      {
        id: 'pdf',
        title: 'Clean Printable A4 PDF Export',
        content: 'Generates crisp, selectable-text PDFs formatted specifically for standard A4 paper in Portrait or Landscape, with zero awkward text clipping or URL watermarks.',
        bullets: ['A4 Landscape & Portrait', 'Inspection Ready', 'Clean Margins']
      },
      {
        id: 'offline',
        title: 'Offline Auto-Save & Privacy',
        content: "Plans are securely saved directly in your device's browser memory. Draft plans in your staffroom even when the internet is intermittent.",
        bullets: ['Local Browser Storage', 'Zero Forced Login', 'No Student Tracking']
      }
    ],
    isPublished: true,
    lastUpdated: new Date().toISOString(),
    updatedBy: 'system'
  },

  about: {
    id: 'about',
    pageName: 'About Us',
    badge: 'About ISEZERANO ONLINE',
    title: 'Supporting Rwandan Educators in Standardized Lesson Planning',
    subtitle: 'ISEZERANO ONLINE is a specialized educational web platform built to help primary and secondary school teachers in Rwanda prepare thorough, pedagogical, and officially aligned Competence-Based Curriculum (CBC) lesson plans.',
    highlightBox: {
      enabled: true,
      badge: 'Built by a Rwandan Teacher',
      title: 'From the Classroom of GS GITUMBA to Rwandan Educators Everywhere',
      content: 'This platform was developed by a Rwandan teacher serving at GS GITUMBA, a school located in Buyoga Sector, Rulindo District, Northern Province, Rwanda. It was created to support fellow educators in preparing well-structured lesson plans aligned with Rwanda’s Competence-Based Curriculum (CBC) and to make lesson preparation easier, more organized, and more efficient.'
    },
    sections: [
      {
        id: 'purpose',
        title: 'Our Purpose & Rwandan CBC Alignment',
        content: "In Rwanda, the introduction of the Competence-Based Curriculum (CBC) by the Ministry of Education (MINEDUC) and the Rwanda Basic Education Board (REB) represented a transformative shift from rote memorization toward learner-centered competence development.\n\nHowever, drafting detailed 8-column lesson plans by hand or in generic text editors requires extensive repetitive formatting each week. Teachers must balance instructional objectives across Bloom's Taxonomy, integrate generic competences and cross-cutting issues, and detail concrete teacher activities and learner tasks.\n\nISEZERANO ONLINE eliminates this mechanical friction by providing a structured, guided digital workspace tailored specifically to the official Rwandan CBC format.",
        bullets: [
          'Full adherence to the official MINEDUC / REB 8-column lesson planning layout',
          "Guided Bloom's Taxonomy operational verb selection across Cognitive, Affective, and Psychomotor domains",
          'Integration of 24 official Rwandan CBC Cross-Cutting Issues and Generic Competences',
          'Instant selectable A4 PDF generation formatted for official inspection and school administrative archiving'
        ]
      },
      {
        id: 'principles',
        title: 'Guiding Principles',
        content: 'Built with genuine respect for teachers’ time, privacy, and pedagogical autonomy, the platform follows three strict commitments:',
        bullets: [
          'REB Standards Fidelity: We adhere strictly to national guidelines without modifying the mandated 8-column structure or introducing non-standard requirements.',
          'Zero-Barrier Access: Teachers can start drafting immediately. There is no forced sign-in wall, mandatory personal data collection, or paywall to use the core lesson plan generator.',
          'Offline-First Local Storage: All drafted lesson plans remain safely preserved on the educator’s device even during network disconnections.'
        ]
      }
    ],
    isPublished: true,
    lastUpdated: new Date().toISOString(),
    updatedBy: 'system'
  },

  contact: {
    id: 'contact',
    pageName: 'Contact Us',
    badge: 'Teacher Inquiries & Support',
    title: 'Contact Us & Share Feedback',
    subtitle: 'Have questions about lesson planning, suggestions for curriculum templates, or school collaboration inquiries? Reach out directly to our team at GS GITUMBA.',
    highlightBox: {
      enabled: true,
      badge: 'Direct School Engagement',
      title: 'Serving the Education Community in Northern Province and Beyond',
      content: 'We welcome inquiries from fellow teachers, headteachers, Director of Studies (DOS), and sector education officers seeking guidance or proposing enhancements to our CBC lesson planning suite.'
    },
    contactData: {
      schoolName: 'GS GITUMBA',
      address: 'Buyoga Sector, Rulindo District, Northern Province, Rwanda',
      email: 'twizerefelix90@gmail.com',
      phone: '0782971258',
      whatsapp: '250782971258',
      workingHours: 'Monday – Friday: 7:30 AM – 5:00 PM CAT'
    },
    sections: [
      {
        id: 'faq',
        title: 'Frequently Asked Questions & Support',
        content: 'Find rapid answers to the most common questions regarding the platform, offline capabilities, and lesson plan printing:',
        bullets: [
          'Do I need an account to prepare lesson plans? No. The generator is immediately accessible to all educators without any registration or login requirement.',
          'Can I print directly to A4 paper? Yes. The system includes an official A4 portrait layout with standard borders compatible with all standard school printers.',
          'Is my drafted data safe if my internet disconnects? Yes. Every modification is auto-saved locally in your browser storage so your work is never lost.'
        ]
      }
    ],
    isPublished: true,
    lastUpdated: new Date().toISOString(),
    updatedBy: 'system'
  },

  privacy: {
    id: 'privacy',
    pageName: 'Privacy Policy',
    badge: 'Transparency & Data Security',
    title: 'Privacy Policy & Data Protection',
    subtitle: 'Transparent documentation on how educator data, lesson records, and local storage are handled at ISEZERANO ONLINE.',
    highlightBox: {
      enabled: true,
      badge: 'Notice for School Leaders & Educators',
      title: 'Our Strict Privacy Commitment',
      content: 'ISEZERANO ONLINE does not sell, monetize, or track sensitive personal student information. Our tools are built strictly for pedagogical preparation and teacher productivity.'
    },
    sections: [
      {
        id: 'storage',
        title: '1. Where and How Your Data Is Stored',
        content: 'The application operates with an offline-first local architecture complemented by optional cloud database synchronization:\n\n• Local Browser Storage: Lesson plans and school preferences are automatically saved in your personal device’s browser storage (localStorage). This ensures immediate access, zero-login drafting, and full functionality even without an internet connection.\n\n• Cloud Database (Firebase Firestore): When cloud synchronization is active, records are securely transmitted and isolated with strict owner-based Firestore security rules.',
        bullets: [
          'Lesson plans drafted locally never leave your device unless explicitly saved to cloud sync.',
          'No telemetry or tracking scripts harvest your lesson text for advertising.',
          'You retain full rights to delete or export your pedagogical data at any time.'
        ]
      },
      {
        id: 'auth',
        title: '2. Administrator & Teacher Authentication',
        content: 'When administrator access or optional teacher accounts are configured, authentication tokens and emails are processed securely via Firebase Authentication with industry-standard TLS encryption. Administrator access is restricted exclusively to the authorized platform administrator.',
        bullets: [
          'Strict Firebase Security Rules enforce role-based access control.',
          'Public visitors cannot access internal administrative dashboards or confidential user lists.',
          'Passwords and credentials are never stored in plain text or client-side JavaScript.'
        ]
      }
    ],
    isPublished: true,
    lastUpdated: new Date().toISOString(),
    updatedBy: 'system'
  },

  terms: {
    id: 'terms',
    pageName: 'Terms & Conditions',
    badge: 'Educational Service Agreement',
    title: 'Terms and Conditions of Service',
    subtitle: 'Terms governing the access and pedagogical use of the ISEZERANO ONLINE – GS GITUMBA platform.',
    highlightBox: {
      enabled: true,
      badge: 'Pedagogical Guidelines',
      title: 'Commitment to High-Quality Rwandan Education',
      content: 'By accessing ISEZERANO ONLINE, educators agree to use the platform in support of high-quality, standardized teaching aligned with the Rwanda Basic Education Board (REB) Competence-Based Curriculum.'
    },
    sections: [
      {
        id: 'acceptance',
        title: '1. Acceptance of Terms',
        content: 'By accessing or using ISEZERANO ONLINE – GS GITUMBA, you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions. These terms apply to all teachers, school leaders, visitors, and administrators.',
        bullets: [
          'You agree to use the platform in compliance with all relevant Rwandan educational guidelines and laws.',
          'You acknowledge that lesson plans generated are intended for instructional preparation and classroom execution.',
          'If you disagree with any portion of these terms, you may cease using the platform at any time.'
        ]
      },
      {
        id: 'license',
        title: '2. Permitted Use & Teacher Intellectual Property',
        content: 'Educators maintain full ownership and pedagogical copyright over the lesson plans, instructional objectives, notes, and teaching materials they author on the platform.',
        bullets: [
          'You are granted a free, non-exclusive license to generate, export, print, and distribute your lesson plans.',
          'You may freely utilize exported PDFs for inspection by Headteachers, Deans of Studies (DOS), and Education Inspectors.',
          'You may not reverse-engineer, attempt unauthorized security breaches, or disrupt platform infrastructure.'
        ]
      },
      {
        id: 'guarantee',
        title: '3. Zero-Cost Access Guarantee for Teachers',
        content: 'The core CBC 8-column lesson planning tools and public educational information of ISEZERANO ONLINE are provided free of charge to Rwandan educators as a community initiative from GS GITUMBA.'
      }
    ],
    isPublished: true,
    lastUpdated: new Date().toISOString(),
    updatedBy: 'system'
  }
};

/**
 * Fetch published content for a given page with localStorage cache and fallback to defaults
 */
export const getPageContent = async (pageId: EditablePageId): Promise<WebsitePageContent> => {
  const db = initFirestoreIfConfigured();
  if (db) {
    try {
      const docRef = doc(db, 'website_pages', pageId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const remote = snap.data() as WebsitePageContent;
        const merged: WebsitePageContent = {
          ...DEFAULT_PAGES_CONTENT[pageId],
          ...remote,
          id: pageId
        };
        try {
          localStorage.setItem(`${PAGE_STORAGE_PREFIX}${pageId}`, JSON.stringify(merged));
        } catch {
          // ignore cache error
        }
        return merged;
      }
    } catch (err) {
      console.warn(`Could not fetch page "${pageId}" from Firestore, using cache:`, err);
    }
  }

  // Fallback to localStorage cache
  try {
    const cached = localStorage.getItem(`${PAGE_STORAGE_PREFIX}${pageId}`);
    if (cached) {
      const parsed = JSON.parse(cached);
      return {
        ...DEFAULT_PAGES_CONTENT[pageId],
        ...parsed,
        id: pageId
      };
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
          const merged: WebsitePageContent = {
            ...DEFAULT_PAGES_CONTENT[pageId],
            ...remote,
            id: pageId
          };
          try {
            localStorage.setItem(`${PAGE_STORAGE_PREFIX}${pageId}`, JSON.stringify(merged));
          } catch {
            // ignore
          }
          onUpdate(merged);
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
): Promise<{ success: boolean; error?: string }> => {
  const updatedPage: WebsitePageContent = {
    ...page,
    isPublished: publish,
    lastUpdated: new Date().toISOString(),
    updatedBy: adminUid
  };

  const db = initFirestoreIfConfigured();
  if (db) {
    try {
      const docRef = doc(db, 'website_pages', page.id);
      await setDoc(docRef, updatedPage);

      // Update local cache
      try {
        localStorage.setItem(`${PAGE_STORAGE_PREFIX}${page.id}`, JSON.stringify(updatedPage));
      } catch {
        // ignore
      }

      // Notify public views of live update
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('website_pages_updated', {
            detail: { pageId: page.id, page: updatedPage }
          })
        );
      }

      return { success: true };
    } catch (err: unknown) {
      console.error(`Error saving page "${page.id}":`, err);
      const message = err instanceof Error ? err.message : 'Failed to save page to Firestore';
      return { success: false, error: message };
    }
  }

  // Offline / fallback save
  try {
    localStorage.setItem(`${PAGE_STORAGE_PREFIX}${page.id}`, JSON.stringify(updatedPage));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('website_pages_updated', {
          detail: { pageId: page.id, page: updatedPage }
        })
      );
    }
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to cache page';
    return { success: false, error: message };
  }
};

/**
 * Restore a page to its original default content
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
  return savePageContent(original, adminUid, true);
};
