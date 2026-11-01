import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { 
  WebsiteDesignSettings, 
  WebsiteColorSettings, 
  WebsiteTypographySettings, 
  WebsiteLogoSettings,
  WebsiteBrandingSettings,
  AnnouncementStripSettings,
  AnnouncementItem,
  DEFAULT_WEBSITE_DESIGN,
  DEFAULT_WEBSITE_COLORS,
  DEFAULT_WEBSITE_TYPOGRAPHY,
  DEFAULT_WEBSITE_LOGO,
  DEFAULT_WEBSITE_BRANDING,
  DEFAULT_ANNOUNCEMENT_STRIP
} from '../types/websiteDesign';
import { 
  getWebsiteDesignSettings, 
  saveWebsiteDesignSettings, 
  applyDesignCssVariables,
  updateBrowserFavicon,
  subscribeToWebsiteDesign,
  uploadAndSaveWebsiteLogo,
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
  resetSectionToDefault: (section: 'branding' | 'colors' | 'typography' | 'logo' | 'announcements' | 'all') => void;
  resetSingleField: (section: 'branding' | 'colors' | 'typography' | 'logo' | 'announcements', fieldKey: string) => void;
  setPreviewingDraft: (preview: boolean) => void;
  cancelDraft: () => void;
  publishSettings: () => Promise<{ success: boolean; error?: string }>;
  uploadLogoFile: (file: File, onProgress?: (progress: LogoUploadProgress) => void) => Promise<LogoUploadResult>;
  reloadSettings: () => Promise<void>;

  // Convenience Getters
  branding: WebsiteBrandingSettings;
  announcements: AnnouncementStripSettings;
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

  const resetSectionToDefault = (section: 'branding' | 'colors' | 'typography' | 'logo' | 'announcements' | 'all') => {
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
      applyDesignCssVariables(updated);
      return updated;
    });
    setIsDraftDirty(true);
    isDraftDirtyRef.current = true;
  };

  const resetSingleField = (section: 'branding' | 'colors' | 'typography' | 'logo' | 'announcements', fieldKey: string) => {
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

  const publishSettings = async (): Promise<{ success: boolean; error?: string; isLocalFallback?: boolean }> => {
    setIsPublishing(true);
    try {
      const adminUid = user?.uid || user?.email || 'admin';
      const result = await saveWebsiteDesignSettings(draftSettings, adminUid);
      
      // Update published settings and sync DOM immediately
      setPublishedSettings(draftSettings);
      setIsDraftDirty(false);
      isDraftDirtyRef.current = false;
      setIsPreviewingDraft(false);
      applyDesignCssVariables(draftSettings);

      if (draftSettings.logo.updateFavicon && draftSettings.logo.logoUrl) {
        updateBrowserFavicon(draftSettings.logo.logoUrl);
      }

      if (result.success) {
        return { success: true };
      } else {
        return { 
          success: true, 
          isLocalFallback: true, 
          error: result.error 
        };
      }
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
      // Immediately reflect published logo
      setPublishedSettings(prev => ({
        ...prev,
        logo: {
          ...prev.logo,
          logoUrl: result.url!,
          isCustomLogo: true
        }
      }));

      // Also update draft
      setDraftSettings(prev => ({
        ...prev,
        logo: {
          ...prev.logo,
          logoUrl: result.url!,
          isCustomLogo: true
        }
      }));

      setIsDraftDirty(false);
      updateBrowserFavicon(result.url);
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
        resetSectionToDefault,
        resetSingleField,
        setPreviewingDraft: setIsPreviewingDraft,
        cancelDraft,
        publishSettings,
        uploadLogoFile,
        reloadSettings: loadSettings,
        branding: activeSettings.branding || DEFAULT_WEBSITE_BRANDING,
        announcements: activeSettings.announcements || DEFAULT_ANNOUNCEMENT_STRIP,
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
