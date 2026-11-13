import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { 
  WebsiteDesignSettings, 
  WebsiteColorSettings, 
  WebsiteTypographySettings, 
  WebsiteLogoSettings,
  WebsiteBrandingSettings,
  AnnouncementStripSettings,
  AnnouncementItem,
  HomepageSectionConfig,
  SectionCustomContent,
  NavigationMenuItem,
  WebsiteDesignVersion,
  DEFAULT_WEBSITE_DESIGN,
  DEFAULT_WEBSITE_COLORS,
  DEFAULT_WEBSITE_TYPOGRAPHY,
  DEFAULT_WEBSITE_LOGO,
  DEFAULT_WEBSITE_BRANDING,
  DEFAULT_ANNOUNCEMENT_STRIP,
  DEFAULT_HOMEPAGE_SECTIONS,
  DEFAULT_NAVIGATION_MENUS
} from '../types/websiteDesign';
import { 
  getWebsiteDesignSettings, 
  saveWebsiteDesignSettings, 
  restoreWebsiteDesignVersion,
  applyDesignCssVariables,
  updateBrowserFavicon,
  subscribeToWebsiteDesign,
  uploadAndSaveWebsiteLogo,
  removeAndSaveWebsiteLogo,
  LogoUploadProgress,
  LogoUploadResult
} from '../services/websiteDesignService';
import { useAuth } from './AuthContext';

interface WebsiteDesignContextType {
  publishedSettings: WebsiteDesignSettings;
  draftSettings: WebsiteDesignSettings;
  activeSettings: WebsiteDesignSettings;
  isDraftDirty: boolean;
  isPreviewingDraft: boolean;
  isLoading: boolean;
  isPublishing: boolean;

  // Actions
  updateDraftBranding: (branding: Partial<WebsiteBrandingSettings>) => void;
  updateDraftColors: (colors: Partial<WebsiteColorSettings>) => void;
  updateDraftTypography: (typography: Partial<WebsiteTypographySettings>) => void;
  updateDraftLogo: (logo: Partial<WebsiteLogoSettings>) => void;
  updateDraftAnnouncements: (announcements: Partial<AnnouncementStripSettings>) => void;
  addAnnouncementMessage: (text: string, badge?: string, linkUrl?: string) => void;
  updateAnnouncementMessage: (id: string, updates: Partial<AnnouncementItem>) => void;
  deleteAnnouncementMessage: (id: string) => void;
  reorderAnnouncementMessage: (id: string, direction: 'up' | 'down') => void;

  // No-Code Section Actions
  updateDraftHomepageSections: (sections: HomepageSectionConfig[]) => void;
  addHomepageSection: (section: HomepageSectionConfig) => void;
  updateHomepageSection: (sectionId: string, updates: Partial<HomepageSectionConfig>) => void;
  deleteHomepageSection: (sectionId: string) => void;
  reorderHomepageSection: (sectionId: string, direction: 'up' | 'down') => void;
  toggleHomepageSection: (sectionId: string, enabled?: boolean) => void;
  updateHomepageSectionOption: (sectionId: string, optionKey: string, value: boolean) => void;
  updateHomepageSectionContent: (sectionId: string, contentUpdates: Partial<SectionCustomContent>) => void;
  resetHomepageSectionsToDefault: () => void;

  // No-Code Navigation Menu Actions
  updateDraftNavigationMenus: (menus: NavigationMenuItem[]) => void;
  addNavigationMenuItem: (item: Omit<NavigationMenuItem, 'id' | 'order'>) => void;
  updateNavigationMenuItem: (id: string, updates: Partial<NavigationMenuItem>) => void;
  deleteNavigationMenuItem: (id: string) => void;
  reorderNavigationMenuItem: (id: string, direction: 'up' | 'down') => void;
  toggleNavigationMenuItem: (id: string, enabled?: boolean) => void;
  resetNavigationMenusToDefault: () => void;

  // Reset & Undo Actions
  resetSectionToDefault: (section: 'branding' | 'colors' | 'typography' | 'logo' | 'announcements' | 'layout' | 'menus' | 'all') => void;
  resetSingleField: (section: 'branding' | 'colors' | 'typography' | 'logo' | 'announcements' | 'layout', fieldKey: string) => void;
  setPreviewingDraft: (preview: boolean) => void;
  cancelDraft: () => void;
  undoDraftChanges: () => void;
  restoreVersion: (version: WebsiteDesignVersion) => Promise<{ success: boolean; error?: string }>;
  publishSettings: (summaryNote?: string) => Promise<{ success: boolean; error?: string }>;
  uploadLogoFile: (file: File, onProgress?: (progress: LogoUploadProgress) => void) => Promise<LogoUploadResult>;
  removeLogoFile: () => Promise<{ success: boolean; error?: string }>;
  reloadSettings: () => Promise<void>;

  // Convenience Getters
  branding: WebsiteBrandingSettings;
  announcements: AnnouncementStripSettings;
  homepageSections: HomepageSectionConfig[];
  navigationMenus: NavigationMenuItem[];
  versionHistory: WebsiteDesignVersion[];
  logoUrl: string;
  logoSettings: WebsiteLogoSettings;
  colors: WebsiteColorSettings;
  typography: WebsiteTypographySettings;
}

const WebsiteDesignContext = createContext<WebsiteDesignContextType | undefined>(undefined);

export const WebsiteDesignProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [publishedSettings, setPublishedSettings] = useState<WebsiteDesignSettings>(DEFAULT_WEBSITE_DESIGN);
  const [draftSettings, setDraftSettings] = useState<WebsiteDesignSettings>(DEFAULT_WEBSITE_DESIGN);
  const [isDraftDirty, setIsDraftDirty] = useState<boolean>(false);
  const [isPreviewingDraft, setIsPreviewingDraft] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isPublishing, setIsPublishing] = useState<boolean>(false);

  // Ref to track draft dirty state without triggering re-subscription cycles
  const isDraftDirtyRef = useRef<boolean>(false);

  useEffect(() => {
    isDraftDirtyRef.current = isDraftDirty;
  }, [isDraftDirty]);

  // Initial load and real-time Firestore synchronization - runs ONCE on mount
  useEffect(() => {
    loadSettings();

    // Attach real-time snapshot listener
    const unsubscribe = subscribeToWebsiteDesign((remoteSettings) => {
      setPublishedSettings(remoteSettings);
      
      // If the admin does not have uncommitted local draft changes, keep draft in sync
      if (!isDraftDirtyRef.current) {
        setDraftSettings(remoteSettings);
        applyDesignCssVariables(remoteSettings);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []); // Run once on mount to prevent slider/picker reversion

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const data = await getWebsiteDesignSettings();
      setPublishedSettings(data);
      setDraftSettings(data);
      setIsDraftDirty(false);
      isDraftDirtyRef.current = false;
      applyDesignCssVariables(data);
    } catch (err) {
      console.error('Error loading design settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Active settings: Immediately reflects draft changes while editing so the UI updates live
  const activeSettings = (isDraftDirty || isPreviewingDraft) ? draftSettings : publishedSettings;

  // Real-time CSS variable update whenever active settings change
  useEffect(() => {
    applyDesignCssVariables(activeSettings);
  }, [activeSettings]);

  const updateDraftBranding = (partialBranding: Partial<WebsiteBrandingSettings>) => {
    setDraftSettings(prev => {
      const next = {
        ...prev,
        branding: { ...(prev.branding || DEFAULT_WEBSITE_BRANDING), ...partialBranding }
      };
      applyDesignCssVariables(next);
      return next;
    });
    setIsDraftDirty(true);
    isDraftDirtyRef.current = true;
  };

  const updateDraftColors = (partialColors: Partial<WebsiteColorSettings>) => {
    setDraftSettings(prev => {
      const next = {
        ...prev,
        colors: { ...prev.colors, ...partialColors }
      };
      applyDesignCssVariables(next);
      return next;
    });
    setIsDraftDirty(true);
    isDraftDirtyRef.current = true;
  };

  const updateDraftTypography = (partialTypography: Partial<WebsiteTypographySettings>) => {
    setDraftSettings(prev => {
      const next = {
        ...prev,
        typography: { ...prev.typography, ...partialTypography }
      };
      applyDesignCssVariables(next);
      return next;
    });
    setIsDraftDirty(true);
    isDraftDirtyRef.current = true;
  };

  const updateDraftLogo = (partialLogo: Partial<WebsiteLogoSettings>) => {
    setDraftSettings(prev => {
      const next = {
        ...prev,
        logo: { ...prev.logo, ...partialLogo }
      };
      applyDesignCssVariables(next);
      return next;
    });
    setIsDraftDirty(true);
    isDraftDirtyRef.current = true;
  };

  const updateDraftAnnouncements = (partialAnnouncements: Partial<AnnouncementStripSettings>) => {
    setDraftSettings(prev => {
      const current = prev.announcements || DEFAULT_ANNOUNCEMENT_STRIP;
      const nextAnnouncements: AnnouncementStripSettings = {
        ...current,
        ...partialAnnouncements
      };
      const next = {
        ...prev,
        announcements: nextAnnouncements,
        // Also keep legacy branding fields synchronized
        branding: {
          ...prev.branding,
          headerAnnouncement: nextAnnouncements.messages[0]?.text || prev.branding?.headerAnnouncement || '',
          headerAnnouncementEnabled: nextAnnouncements.enabled
        }
      };
      return next;
    });
    setIsDraftDirty(true);
    isDraftDirtyRef.current = true;
  };

  const addAnnouncementMessage = (text: string, badge?: string, linkUrl?: string) => {
    if (!text.trim()) return;
    setDraftSettings(prev => {
      const current = prev.announcements || DEFAULT_ANNOUNCEMENT_STRIP;
      const newMsg: AnnouncementItem = {
        id: `ann-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        text: text.trim(),
        badge: badge?.trim() || undefined,
        linkUrl: linkUrl?.trim() || undefined,
        active: true
      };
      const updatedMessages = [...current.messages, newMsg];
      const nextAnnouncements = { ...current, messages: updatedMessages };
      return {
        ...prev,
        announcements: nextAnnouncements,
        branding: {
          ...prev.branding,
          headerAnnouncement: updatedMessages[0]?.text || '',
          headerAnnouncementEnabled: nextAnnouncements.enabled
        }
      };
    });
    setIsDraftDirty(true);
    isDraftDirtyRef.current = true;
  };

  const updateAnnouncementMessage = (id: string, updates: Partial<AnnouncementItem>) => {
    setDraftSettings(prev => {
      const current = prev.announcements || DEFAULT_ANNOUNCEMENT_STRIP;
      const updatedMessages = current.messages.map(msg => 
        msg.id === id ? { ...msg, ...updates } : msg
      );
      const nextAnnouncements = { ...current, messages: updatedMessages };
      return {
        ...prev,
        announcements: nextAnnouncements,
        branding: {
          ...prev.branding,
          headerAnnouncement: updatedMessages[0]?.text || '',
          headerAnnouncementEnabled: nextAnnouncements.enabled
        }
      };
    });
    setIsDraftDirty(true);
    isDraftDirtyRef.current = true;
  };

  const deleteAnnouncementMessage = (id: string) => {
    setDraftSettings(prev => {
      const current = prev.announcements || DEFAULT_ANNOUNCEMENT_STRIP;
      const filtered = current.messages.filter(msg => msg.id !== id);
      const nextAnnouncements = { ...current, messages: filtered };
      return {
        ...prev,
        announcements: nextAnnouncements,
        branding: {
          ...prev.branding,
          headerAnnouncement: filtered[0]?.text || '',
          headerAnnouncementEnabled: nextAnnouncements.enabled
        }
      };
    });
    setIsDraftDirty(true);
    isDraftDirtyRef.current = true;
  };

  const reorderAnnouncementMessage = (id: string, direction: 'up' | 'down') => {
    setDraftSettings(prev => {
      const current = prev.announcements || DEFAULT_ANNOUNCEMENT_STRIP;
      const msgs = [...current.messages];
      const index = msgs.findIndex(m => m.id === id);
      if (index === -1) return prev;
      if (direction === 'up' && index > 0) {
        const temp = msgs[index];
        msgs[index] = msgs[index - 1];
        msgs[index - 1] = temp;
      } else if (direction === 'down' && index < msgs.length - 1) {
        const temp = msgs[index];
        msgs[index] = msgs[index + 1];
        msgs[index + 1] = temp;
      } else {
        return prev;
      }
      return {
        ...prev,
        announcements: { ...current, messages: msgs }
      };
    });
    setIsDraftDirty(true);
    isDraftDirtyRef.current = true;
  };

  const updateDraftHomepageSections = (sections: HomepageSectionConfig[]) => {
    setDraftSettings(prev => ({
      ...prev,
      homepageSections: sections
    }));
    setIsDraftDirty(true);
    isDraftDirtyRef.current = true;
  };

  const reorderHomepageSection = (sectionId: string, direction: 'up' | 'down') => {
    setDraftSettings(prev => {
      const currentSections = [...(prev.homepageSections || DEFAULT_HOMEPAGE_SECTIONS)];
      currentSections.sort((a, b) => a.order - b.order);
      const index = currentSections.findIndex(s => s.id === sectionId);
      if (index === -1) return prev;

      if (direction === 'up' && index > 0) {
        const prevItem = currentSections[index - 1];
        const currentItem = currentSections[index];
        const tempOrder = prevItem.order;
        prevItem.order = currentItem.order;
        currentItem.order = tempOrder;
      } else if (direction === 'down' && index < currentSections.length - 1) {
        const nextItem = currentSections[index + 1];
        const currentItem = currentSections[index];
        const tempOrder = nextItem.order;
        nextItem.order = currentItem.order;
        currentItem.order = tempOrder;
      } else {
        return prev;
      }

      currentSections.sort((a, b) => a.order - b.order);
      const reindexed = currentSections.map((s, idx) => ({ ...s, order: idx + 1 }));

      return {
        ...prev,
        homepageSections: reindexed
      };
    });
    setIsDraftDirty(true);
    isDraftDirtyRef.current = true;
  };

  const toggleHomepageSection = (sectionId: string, enabled?: boolean) => {
    setDraftSettings(prev => {
      const currentSections = [...(prev.homepageSections || DEFAULT_HOMEPAGE_SECTIONS)];
      const updated = currentSections.map(s => {
        if (s.id === sectionId) {
          return { ...s, enabled: enabled !== undefined ? enabled : !s.enabled };
        }
        return s;
      });
      return {
        ...prev,
        homepageSections: updated
      };
    });
    setIsDraftDirty(true);
    isDraftDirtyRef.current = true;
  };

  const updateHomepageSectionOption = (sectionId: string, optionKey: string, value: boolean) => {
    setDraftSettings(prev => {
      const currentSections = [...(prev.homepageSections || DEFAULT_HOMEPAGE_SECTIONS)];
      const updated = currentSections.map(s => {
        if (s.id === sectionId) {
          return {
            ...s,
            options: {
              ...(s.options || {}),
              [optionKey]: value
            }
          };
        }
        return s;
      });
      return {
        ...prev,
        homepageSections: updated
      };
    });
    setIsDraftDirty(true);
    isDraftDirtyRef.current = true;
  };

  const resetHomepageSectionsToDefault = () => {
    setDraftSettings(prev => ({
      ...prev,
      homepageSections: [...DEFAULT_HOMEPAGE_SECTIONS]
    }));
    setIsDraftDirty(true);
    isDraftDirtyRef.current = true;
  };

  // --- NO-CODE SECTION ACTIONS ---
  const addHomepageSection = (newSec: HomepageSectionConfig) => {
    setDraftSettings(prev => {
      const current = prev.homepageSections || DEFAULT_HOMEPAGE_SECTIONS;
      const maxOrder = current.reduce((max, s) => Math.max(max, s.order || 0), 0);
      const sectionWithOrder: HomepageSectionConfig = {
        ...newSec,
        order: maxOrder + 1
      };
      return {
        ...prev,
        homepageSections: [...current, sectionWithOrder]
      };
    });
    setIsDraftDirty(true);
    isDraftDirtyRef.current = true;
  };

  const updateHomepageSection = (sectionId: string, updates: Partial<HomepageSectionConfig>) => {
    setDraftSettings(prev => {
      const current = prev.homepageSections || DEFAULT_HOMEPAGE_SECTIONS;
      const updated = current.map(s => {
        if (s.id === sectionId) {
          return {
            ...s,
            ...updates,
            content: updates.content ? { ...(s.content || {}), ...updates.content } : s.content,
            options: updates.options ? { ...(s.options || {}), ...updates.options } : s.options
          };
        }
        return s;
      });
      return {
        ...prev,
        homepageSections: updated
      };
    });
    setIsDraftDirty(true);
    isDraftDirtyRef.current = true;
  };

  const deleteHomepageSection = (sectionId: string) => {
    setDraftSettings(prev => {
      const current = prev.homepageSections || DEFAULT_HOMEPAGE_SECTIONS;
      const filtered = current.filter(s => s.id !== sectionId);
      const reindexed = filtered.map((s, idx) => ({ ...s, order: idx + 1 }));
      return {
        ...prev,
        homepageSections: reindexed
      };
    });
    setIsDraftDirty(true);
    isDraftDirtyRef.current = true;
  };

  const updateHomepageSectionContent = (sectionId: string, contentUpdates: Partial<SectionCustomContent>) => {
    setDraftSettings(prev => {
      const current = prev.homepageSections || DEFAULT_HOMEPAGE_SECTIONS;
      const updated = current.map(s => {
        if (s.id === sectionId) {
          return {
            ...s,
            content: {
              ...(s.content || {}),
              ...contentUpdates
            }
          };
        }
        return s;
      });
      return {
        ...prev,
        homepageSections: updated
      };
    });
    setIsDraftDirty(true);
    isDraftDirtyRef.current = true;
  };

  // --- NO-CODE NAVIGATION MENU ACTIONS ---
  const updateDraftNavigationMenus = (menus: NavigationMenuItem[]) => {
    setDraftSettings(prev => ({
      ...prev,
      navigationMenus: menus
    }));
    setIsDraftDirty(true);
    isDraftDirtyRef.current = true;
  };

  const addNavigationMenuItem = (item: Omit<NavigationMenuItem, 'id' | 'order'>) => {
    setDraftSettings(prev => {
      const current = prev.navigationMenus || DEFAULT_NAVIGATION_MENUS;
      const maxOrder = current.reduce((max, m) => Math.max(max, m.order || 0), 0);
      const newItem: NavigationMenuItem = {
        ...item,
        id: `nav-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        order: maxOrder + 1
      };
      return {
        ...prev,
        navigationMenus: [...current, newItem]
      };
    });
    setIsDraftDirty(true);
    isDraftDirtyRef.current = true;
  };

  const updateNavigationMenuItem = (id: string, updates: Partial<NavigationMenuItem>) => {
    setDraftSettings(prev => {
      const current = prev.navigationMenus || DEFAULT_NAVIGATION_MENUS;
      const updated = current.map(m => m.id === id ? { ...m, ...updates } : m);
      return {
        ...prev,
        navigationMenus: updated
      };
    });
    setIsDraftDirty(true);
    isDraftDirtyRef.current = true;
  };

  const deleteNavigationMenuItem = (id: string) => {
    setDraftSettings(prev => {
      const current = prev.navigationMenus || DEFAULT_NAVIGATION_MENUS;
      const filtered = current.filter(m => m.id !== id);
      const reindexed = filtered.map((m, idx) => ({ ...m, order: idx + 1 }));
      return {
        ...prev,
        navigationMenus: reindexed
      };
    });
    setIsDraftDirty(true);
    isDraftDirtyRef.current = true;
  };

  const reorderNavigationMenuItem = (id: string, direction: 'up' | 'down') => {
    setDraftSettings(prev => {
      const current = [...(prev.navigationMenus || DEFAULT_NAVIGATION_MENUS)];
      current.sort((a, b) => a.order - b.order);
      const idx = current.findIndex(m => m.id === id);
      if (idx === -1) return prev;

      if (direction === 'up' && idx > 0) {
        const prevItem = current[idx - 1];
        const currentItem = current[idx];
        const temp = prevItem.order;
        prevItem.order = currentItem.order;
        currentItem.order = temp;
      } else if (direction === 'down' && idx < current.length - 1) {
        const nextItem = current[idx + 1];
        const currentItem = current[idx];
        const temp = nextItem.order;
        nextItem.order = currentItem.order;
        currentItem.order = temp;
      } else {
        return prev;
      }

      current.sort((a, b) => a.order - b.order);
      const reindexed = current.map((m, i) => ({ ...m, order: i + 1 }));
      return {
        ...prev,
        navigationMenus: reindexed
      };
    });
    setIsDraftDirty(true);
    isDraftDirtyRef.current = true;
  };

  const toggleNavigationMenuItem = (id: string, enabled?: boolean) => {
    setDraftSettings(prev => {
      const current = prev.navigationMenus || DEFAULT_NAVIGATION_MENUS;
      const updated = current.map(m => {
        if (m.id === id) {
          return { ...m, enabled: enabled !== undefined ? enabled : !m.enabled };
        }
        return m;
      });
      return {
        ...prev,
        navigationMenus: updated
      };
    });
    setIsDraftDirty(true);
    isDraftDirtyRef.current = true;
  };

  const resetNavigationMenusToDefault = () => {
    setDraftSettings(prev => ({
      ...prev,
      navigationMenus: [...DEFAULT_NAVIGATION_MENUS]
    }));
    setIsDraftDirty(true);
    isDraftDirtyRef.current = true;
  };

  const resetSectionToDefault = (section: 'branding' | 'colors' | 'typography' | 'logo' | 'announcements' | 'layout' | 'menus' | 'all') => {
    setDraftSettings(prev => {
      let updated = { ...prev };
      if (section === 'branding' || section === 'all') {
        updated.branding = { ...DEFAULT_WEBSITE_BRANDING };
      }
      if (section === 'colors' || section === 'all') {
        updated.colors = { ...DEFAULT_WEBSITE_COLORS };
      }
      if (section === 'typography' || section === 'all') {
        updated.typography = { ...DEFAULT_WEBSITE_TYPOGRAPHY };
      }
      if (section === 'logo' || section === 'all') {
        updated.logo = { ...DEFAULT_WEBSITE_LOGO };
      }
      if (section === 'announcements' || section === 'all') {
        updated.announcements = { ...DEFAULT_ANNOUNCEMENT_STRIP };
      }
      if (section === 'layout' || section === 'all') {
        updated.homepageSections = [...DEFAULT_HOMEPAGE_SECTIONS];
      }
      if (section === 'menus' || section === 'all') {
        updated.navigationMenus = [...DEFAULT_NAVIGATION_MENUS];
      }
      applyDesignCssVariables(updated);
      return updated;
    });
    setIsDraftDirty(true);
    isDraftDirtyRef.current = true;
  };

  const resetSingleField = (section: 'branding' | 'colors' | 'typography' | 'logo' | 'announcements' | 'layout', fieldKey: string) => {
    setDraftSettings(prev => {
      const updated = { ...prev };
      if (section === 'branding') {
        (updated.branding as any)[fieldKey] = (DEFAULT_WEBSITE_BRANDING as any)[fieldKey];
      } else if (section === 'colors') {
        (updated.colors as any)[fieldKey] = (DEFAULT_WEBSITE_COLORS as any)[fieldKey];
      } else if (section === 'typography') {
        (updated.typography as any)[fieldKey] = (DEFAULT_WEBSITE_TYPOGRAPHY as any)[fieldKey];
      } else if (section === 'logo') {
        (updated.logo as any)[fieldKey] = (DEFAULT_WEBSITE_LOGO as any)[fieldKey];
      } else if (section === 'announcements') {
        (updated.announcements as any)[fieldKey] = (DEFAULT_ANNOUNCEMENT_STRIP as any)[fieldKey];
      } else if (section === 'layout') {
        updated.homepageSections = [...DEFAULT_HOMEPAGE_SECTIONS];
      }
      applyDesignCssVariables(updated);
      return updated;
    });
    setIsDraftDirty(true);
    isDraftDirtyRef.current = true;
  };

  const cancelDraft = () => {
    setDraftSettings(publishedSettings);
    setIsDraftDirty(false);
    isDraftDirtyRef.current = false;
    setIsPreviewingDraft(false);
    applyDesignCssVariables(publishedSettings);
  };

  const undoDraftChanges = () => {
    cancelDraft();
  };

  const restoreVersion = async (version: WebsiteDesignVersion): Promise<{ success: boolean; error?: string }> => {
    setIsPublishing(true);
    try {
      const adminUid = user?.uid || user?.email || 'admin';
      const result = await restoreWebsiteDesignVersion(version, adminUid);
      if (result.success && result.restoredSettings) {
        setPublishedSettings(result.restoredSettings);
        setDraftSettings(result.restoredSettings);
        setIsDraftDirty(false);
        isDraftDirtyRef.current = false;
        setIsPreviewingDraft(false);
        applyDesignCssVariables(result.restoredSettings);
        return { success: true };
      }
      return { success: false, error: result.error || 'Failed to restore previous version' };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Restore error';
      return { success: false, error: message };
    } finally {
      setIsPublishing(false);
    }
  };

  const publishSettings = async (summaryNote?: string): Promise<{ success: boolean; error?: string }> => {
    setIsPublishing(true);
    try {
      const adminUid = user?.uid || user?.email || 'admin';
      const result = await saveWebsiteDesignSettings(draftSettings, adminUid, summaryNote);

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Failed to publish website settings to Cloud Firestore.'
        };
      }

      // Sync published state and DOM variables after confirmed Firestore save
      setPublishedSettings(draftSettings);
      setIsDraftDirty(false);
      isDraftDirtyRef.current = false;
      setIsPreviewingDraft(false);
      applyDesignCssVariables(draftSettings);

      if (draftSettings.logo.updateFavicon && draftSettings.logo.logoUrl) {
        updateBrowserFavicon(draftSettings.logo.logoUrl);
      }

      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Publish error';
      return { success: false, error: message };
    } finally {
      setIsPublishing(false);
    }
  };

  const uploadLogoFile = async (
    file: File,
    onProgress?: (progress: LogoUploadProgress) => void
  ): Promise<LogoUploadResult> => {
    const adminUid = user?.uid || user?.email || 'admin';
    const result = await uploadAndSaveWebsiteLogo(file, adminUid, onProgress);

    if (result.success && result.url) {
      setPublishedSettings(prev => ({
        ...prev,
        logo: {
          ...prev.logo,
          logoUrl: result.url!,
          isCustomLogo: true,
          showInHeader: true
        }
      }));

      setDraftSettings(prev => ({
        ...prev,
        logo: {
          ...prev.logo,
          logoUrl: result.url!,
          isCustomLogo: true,
          showInHeader: true
        }
      }));

      setIsDraftDirty(false);
      updateBrowserFavicon(result.url);
    }

    return result;
  };

  const removeLogoFile = async (): Promise<{ success: boolean; error?: string }> => {
    const adminUid = user?.uid || user?.email || 'admin';
    const result = await removeAndSaveWebsiteLogo(adminUid);
    if (result.success) {
      const resetLogo = {
        ...DEFAULT_WEBSITE_LOGO,
        logoUrl: '',
        isCustomLogo: false
      };
      setPublishedSettings(prev => ({ ...prev, logo: resetLogo }));
      setDraftSettings(prev => ({ ...prev, logo: resetLogo }));
      setIsDraftDirty(false);
      isDraftDirtyRef.current = false;
    }
    return result;
  };

  return (
    <WebsiteDesignContext.Provider
      value={{
        publishedSettings,
        draftSettings,
        activeSettings,
        isDraftDirty,
        isPreviewingDraft,
        isLoading,
        isPublishing,
        updateDraftBranding,
        updateDraftColors,
        updateDraftTypography,
        updateDraftLogo,
        updateDraftAnnouncements,
        addAnnouncementMessage,
        updateAnnouncementMessage,
        deleteAnnouncementMessage,
        reorderAnnouncementMessage,
        updateDraftHomepageSections,
        addHomepageSection,
        updateHomepageSection,
        deleteHomepageSection,
        reorderHomepageSection,
        toggleHomepageSection,
        updateHomepageSectionOption,
        updateHomepageSectionContent,
        resetHomepageSectionsToDefault,
        updateDraftNavigationMenus,
        addNavigationMenuItem,
        updateNavigationMenuItem,
        deleteNavigationMenuItem,
        reorderNavigationMenuItem,
        toggleNavigationMenuItem,
        resetNavigationMenusToDefault,
        resetSectionToDefault,
        resetSingleField,
        setPreviewingDraft: setIsPreviewingDraft,
        cancelDraft,
        undoDraftChanges,
        restoreVersion,
        publishSettings,
        uploadLogoFile,
        removeLogoFile,
        reloadSettings: loadSettings,
        branding: activeSettings.branding || DEFAULT_WEBSITE_BRANDING,
        announcements: activeSettings.announcements || DEFAULT_ANNOUNCEMENT_STRIP,
        homepageSections: activeSettings.homepageSections || DEFAULT_HOMEPAGE_SECTIONS,
        navigationMenus: activeSettings.navigationMenus || DEFAULT_NAVIGATION_MENUS,
        versionHistory: activeSettings.versionHistory || [],
        logoUrl: activeSettings.logo.logoUrl || DEFAULT_WEBSITE_LOGO.logoUrl,
        logoSettings: activeSettings.logo,
        colors: activeSettings.colors,
        typography: activeSettings.typography
      }}
    >
      {children}
    </WebsiteDesignContext.Provider>
  );
};

export const useWebsiteDesign = (): WebsiteDesignContextType => {
  const context = useContext(WebsiteDesignContext);
  if (!context) {
    throw new Error('useWebsiteDesign must be used within a WebsiteDesignProvider');
  }
  return context;
};
