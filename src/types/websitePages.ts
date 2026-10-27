export type EditablePageId = 'about' | 'contact' | 'privacy' | 'terms';

export interface PageSection {
  id: string;
  title: string;
  content: string;
  bullets?: string[];
  callout?: string;
}

export interface PageHighlightBox {
  enabled: boolean;
  badge?: string;
  title: string;
  content: string;
}

export interface ContactExtraData {
  schoolName: string;
  address: string;
  email: string;
  phone: string;
  whatsapp: string;
  workingHours: string;
}

export interface WebsitePageContent {
  id: EditablePageId;
  pageName: string;
  badge: string;
  title: string;
  subtitle: string;
  highlightBox?: PageHighlightBox;
  sections: PageSection[];
  contactData?: ContactExtraData;
  isPublished: boolean;
  lastUpdated: string;
  updatedBy: string;
}
